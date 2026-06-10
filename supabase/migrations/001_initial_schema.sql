-- ============================================================
-- Decision Arena — Initial Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id      TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  display_name  TEXT,
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  debates_used  INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Debates ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question          TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('career','business','tech','policy','personal','other')),
  mode              TEXT DEFAULT 'standard' CHECK (mode IN ('standard','boardroom','shark_tank','policy')),
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','error')),
  panel             JSONB NOT NULL DEFAULT '[]',
  current_stage     TEXT DEFAULT 'opening',
  audience_questions JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- ── Debate Messages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debate_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id     UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  agent_name    TEXT NOT NULL,
  agent_role    TEXT,
  stage         TEXT NOT NULL,
  content       TEXT NOT NULL,
  message_type  TEXT DEFAULT 'argument' CHECK (message_type IN ('argument','question','challenge','rebuttal','verdict','moderation')),
  fallacies     JSONB DEFAULT '[]',
  fact_tags     JSONB DEFAULT '[]',
  sequence_num  INT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Agent Scores ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_scores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id             UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id              TEXT NOT NULL,
  agent_name            TEXT,
  agent_color           TEXT,
  logic_score           FLOAT,
  evidence_score        FLOAT,
  practicality_score    FLOAT,
  risk_awareness_score  FLOAT,
  longterm_thinking_score FLOAT,
  persuasiveness_score  FLOAT,
  overall_score         FLOAT,
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (debate_id, agent_id)
);

-- ── Verdicts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verdicts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id           UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  consensus_areas     JSONB DEFAULT '[]',
  disagreements       JSONB DEFAULT '[]',
  risks               JSONB DEFAULT '[]',
  opportunities       JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  confidence_score    FLOAT,
  heatmap_data        JSONB DEFAULT '[]',
  executive_summary   TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── Shared Reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id  UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  slug       TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_debates_user_id      ON debates(user_id);
CREATE INDEX IF NOT EXISTS idx_debates_status       ON debates(status);
CREATE INDEX IF NOT EXISTS idx_debates_created_at   ON debates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_debate_id   ON debate_messages(debate_id);
CREATE INDEX IF NOT EXISTS idx_messages_sequence    ON debate_messages(debate_id, sequence_num);
CREATE INDEX IF NOT EXISTS idx_scores_debate_id     ON agent_scores(debate_id);
CREATE INDEX IF NOT EXISTS idx_verdicts_debate_id   ON verdicts(debate_id);
CREATE INDEX IF NOT EXISTS idx_shared_slug          ON shared_reports(slug);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_reports  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by backend with service key)
-- Frontend uses anon key which is blocked by these policies

-- Allow public reads on shared_reports (for shareable report links)
CREATE POLICY "Public can read shared reports"
  ON shared_reports FOR SELECT USING (true);

-- Block all direct anon access to sensitive tables
-- (Backend uses service_role key and bypasses RLS)
CREATE POLICY "Service role only" ON debates
  FOR ALL USING (false);

CREATE POLICY "Service role only" ON debate_messages
  FOR ALL USING (false);

CREATE POLICY "Service role only" ON agent_scores
  FOR ALL USING (false);

CREATE POLICY "Service role only" ON verdicts
  FOR ALL USING (false);

-- ── Storage Bucket ────────────────────────────────────────────
-- Run in Supabase Dashboard > Storage > New Bucket
-- Bucket name: reports
-- Public: false
-- File size limit: 50MB

-- ── Realtime ──────────────────────────────────────────────────
-- Enable in Dashboard > Database > Replication
-- Add table: debate_messages (for future real-time features)
