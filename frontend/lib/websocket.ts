import type { WSMessage, WSEventType } from "@/types";

type EventHandler = (data: WSMessage) => void;

export class DebateWebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Map<WSEventType, EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private debateId: string | null = null;
  private token: string | null = null;
  private intentionalClose = false;

  private get wsUrl(): string {
    return process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";
  }

  connect(debateId: string, token: string): void {
    this.debateId = debateId;
    this.token = token;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.establishConnection();
  }

  private get language(): string {
    try { return localStorage.getItem("da_locale") || "en"; } catch { return "en"; }
  }

  private establishConnection(): void {
    const url = `${this.wsUrl}/ws/debate/${this.debateId}?token=${this.token}&lang=${this.language}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("debate_started" as WSEventType, {
        type: "debate_started",
        debate_id: this.debateId!,
        data: { connected: true },
        timestamp: new Date().toISOString(),
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as WSMessage;
        this.emit(message.type, message);
      } catch {
        console.error("Failed to parse WS message:", event.data);
      }
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    setTimeout(() => {
      this.reconnectAttempts++;
      this.establishConnection();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  on(event: WSEventType, handler: EventHandler): () => void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(event, [...existing, handler]);
    return () => this.off(event, handler);
  }

  off(event: WSEventType, handler: EventHandler): void {
    const existing = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler)
    );
  }

  private emit(event: WSEventType, data: WSMessage): void {
    const handlers = this.handlers.get(event) ?? [];
    handlers.forEach((h) => h(data));
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new DebateWebSocketManager();
