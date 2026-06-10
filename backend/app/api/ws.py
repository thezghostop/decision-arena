"""WebSocket endpoint for live debate streaming."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.auth import get_current_user
from app.database import DatabaseService
from app.engine.orchestrator import DebateOrchestrator
from app.api.debates import get_active_debates
from app.models.debate import AgentConfig, DebateStage
from app.models.message import MessageType

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws/debate/{debate_id}")
async def debate_websocket(
    websocket: WebSocket,
    debate_id: str,
    token: str = Query(...),
) -> None:
    # Validate token
    try:
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        user = await get_current_user(creds)
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    db = DatabaseService()
    debate = await db.get_debate(debate_id)
    if not debate:
        await websocket.close(code=4004, reason="Debate not found")
        return

    clerk_id = user.get("sub", "")
    db_user = await db.get_user_by_clerk_id(clerk_id)
    if not db_user or debate["user_id"] != db_user["id"]:
        await websocket.close(code=4003, reason="Forbidden")
        return

    await websocket.accept()

    # Completed debate → Q&A mode (stay open, experts respond to new questions)
    if debate.get("status") == "completed":
        await websocket.send_text(json.dumps({"type": "debate_complete"}))
        await _qa_mode(websocket, debate, db)
        return

    # Already running in this process → skip
    active = get_active_debates()
    if debate_id in active:
        logger.info("Debate %s already running, skipping duplicate start", debate_id)
        await websocket.close()
        return

    await db.update_debate_status(debate_id, "running")

    event_queue: asyncio.Queue = asyncio.Queue()

    def on_event(event: dict) -> None:
        event_queue.put_nowait(event)

    panel = [AgentConfig(**p) if isinstance(p, dict) else p for p in debate.get("panel", [])]
    orchestrator = DebateOrchestrator(
        debate_id=debate_id,
        question=debate["question"],
        mode=debate["mode"],
        panel=panel,
        on_event=on_event,
        db_service=db,
    )

    active[debate_id] = orchestrator
    debate_task = asyncio.create_task(orchestrator.run())

    try:
        await asyncio.gather(
            _drain_events(websocket, event_queue, debate_task),
            _read_client(websocket, orchestrator),
            return_exceptions=True,
        )
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", debate_id)
        orchestrator.stop()
    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", debate_id, exc)
    finally:
        orchestrator.stop()
        debate_task.cancel()
        active.pop(debate_id, None)
        try:
            await websocket.close()
        except Exception:
            pass


async def _qa_mode(websocket: WebSocket, debate: dict, db: DatabaseService) -> None:
    """Keep the WS open after debate completion. Each audience question gets
    a fresh round of expert responses streamed back in real time."""
    from app.agents.expert import ExpertAgent

    panel = [AgentConfig(**p) if isinstance(p, dict) else p for p in debate.get("panel", [])]
    experts = {cfg.id: ExpertAgent(cfg) for cfg in panel}
    debate_id = debate["id"]
    question = debate["question"]

    # Build a short context from the last few saved messages
    try:
        saved = await db.get_messages(debate_id)
        context_lines = [
            f"[{m['agent_name']}]: {m['content'][:150]}"
            for m in (saved or [])[-8:]
        ]
        base_context = "\n".join(context_lines)
    except Exception:
        base_context = ""

    seq = 10000  # offset so Q&A messages sort after debate messages

    async def send(event: dict) -> None:
        try:
            await websocket.send_text(json.dumps(event))
        except Exception:
            pass

    while True:
        try:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=600)
            msg = json.loads(raw)

            if msg.get("type") == "ping":
                await send({"type": "pong"})
                continue

            if msg.get("type") != "inject":
                continue

            audience_q = msg.get("question", "").strip()
            if not audience_q:
                continue

            await send({"type": "audience_injected", "question": audience_q})

            # Each expert gives a brief answer
            for agent_cfg in panel:
                expert = experts[agent_cfg.id]
                msg_id = str(uuid.uuid4())
                seq += 1

                await send({
                    "type": "message_start",
                    "messageId": msg_id,
                    "agentId": agent_cfg.id,
                    "agentName": agent_cfg.name,
                    "agentRole": agent_cfg.role,
                    "agentIcon": agent_cfg.icon,
                    "agentColor": agent_cfg.color,
                    "stage": "audience_intervention",
                    "messageType": "argument",
                    "sequenceNum": seq,
                })

                full_content = ""
                try:
                    async for token in expert.speak(
                        stage=DebateStage.audience_intervention,
                        question=question,
                        context=base_context,
                        audience_question=audience_q,
                    ):
                        await send({"type": "token", "messageId": msg_id, "content": token})
                        full_content += token
                except Exception as exc:
                    logger.warning("Q&A expert speak error: %s", exc)

                await send({"type": "message_complete", "messageId": msg_id, "fallacies": [], "factTags": []})

                # Persist Q&A message
                try:
                    from datetime import datetime, timezone
                    await db.save_message({
                        "id": msg_id,
                        "debate_id": debate_id,
                        "agent_id": agent_cfg.id,
                        "agent_name": agent_cfg.name,
                        "agent_role": agent_cfg.role,
                        "agent_icon": agent_cfg.icon,
                        "agent_color": agent_cfg.color,
                        "stage": "audience_intervention",
                        "content": full_content,
                        "message_type": "argument",
                        "fallacies": [],
                        "fact_tags": [],
                        "sequence_num": seq,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
                except Exception as exc:
                    logger.warning("Q&A DB save error: %s", exc)

        except asyncio.TimeoutError:
            # 10-minute idle timeout
            break
        except WebSocketDisconnect:
            break
        except json.JSONDecodeError:
            pass
        except Exception as exc:
            logger.warning("Q&A mode error: %s", exc)
            break

    try:
        await websocket.close()
    except Exception:
        pass


async def _drain_events(
    websocket: WebSocket,
    queue: asyncio.Queue,
    debate_task: asyncio.Task,
) -> None:
    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=1.0)
            await websocket.send_text(json.dumps(event))
            if event.get("type") == "debate_complete":
                break
        except asyncio.TimeoutError:
            if debate_task.done():
                while not queue.empty():
                    event = queue.get_nowait()
                    await websocket.send_text(json.dumps(event))
                break
        except WebSocketDisconnect:
            raise
        except Exception as exc:
            logger.warning("Event drain error: %s", exc)
            break


async def _read_client(websocket: WebSocket, orchestrator: DebateOrchestrator) -> None:
    while True:
        try:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "inject":
                question = msg.get("question", "").strip()
                if question:
                    orchestrator.inject_audience_question(question)
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
        except WebSocketDisconnect:
            raise
        except json.JSONDecodeError:
            pass
        except Exception as exc:
            logger.warning("Client read error: %s", exc)
            break
