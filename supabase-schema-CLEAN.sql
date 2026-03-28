-- ============================================================
-- CHANCE APP — CLEAN INSTALL SCHEMA
-- This DROPS old tables and recreates everything fresh.
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Drop materialized views from old ChatGPT build (MUST come first)
DROP MATERIALIZED VIEW IF EXISTS url_scores CASCADE;
DROP VIEW IF EXISTS url_scores CASCADE;

-- Drop old tables (order matters due to foreign keys)
DROP TABLE IF EXISTS dead_reports CASCADE;
DROP TABLE IF EXISTS url_reports CASCADE;
DROP TABLE IF EXISTS vault_saves CASCADE;
DROP TABLE IF EXISTS url_events CASCADE;
DROP TABLE IF EXISTS url_scores CASCADE;
DROP TABLE IF EXISTS user_rep CASCADE;
DROP TABLE IF EXISTS blocked_domains CASCADE;

-- Drop old tables from the ChatGPT build if they exist
DROP TABLE IF EXISTS url_votes CASCADE;
DROP TABLE IF EXISTS votes CASCADE;

-- DO NOT drop urls table if you want to keep your existing URLs!
-- If you want a totally fresh start, uncomment the next line:
-- DROP TABLE IF EXISTS urls CASCADE;

-- ============================================================
-- 1. URLs table (create only if not exists — preserves your data)
-- ============================================================
CREATE TABLE IF NOT EXISTS urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  domain TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  source TEXT,
  tags TEXT,
  is_dead BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns that might be missing from old schema
DO $$ BEGIN
  ALTER TABLE urls ADD COLUMN IF NOT EXISTS source TEXT;
  ALTER TABLE urls ADD COLUMN IF NOT EXISTS tags TEXT;
  ALTER TABLE urls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_urls_active ON urls (is_dead, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urls_domain ON urls (domain);
CREATE INDEX IF NOT EXISTS idx_urls_category ON urls (category);

-- ============================================================
-- 2. URL Events (reactions + clicks)
-- ============================================================
CREATE TABLE url_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('mindblown', 'yawn', 'click', 'skip')),
  session_id TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_events_unique_reaction
  ON url_events (url_id, session_id, event_type)
  WHERE event_type IN ('mindblown', 'yawn');

CREATE INDEX idx_events_url ON url_events (url_id, event_type);
CREATE INDEX idx_events_session ON url_events (session_id);

-- ============================================================
-- 3. Vault Saves
-- ============================================================
CREATE TABLE vault_saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(url_id, user_id)
);

-- ============================================================
-- 4. URL Reports
-- ============================================================
CREATE TABLE url_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id UUID,
  reason TEXT DEFAULT 'inappropriate',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. Dead Link Reports
-- ============================================================
CREATE TABLE dead_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. Blocked Domains
-- ============================================================
CREATE TABLE blocked_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. URL Scores (fresh, with all columns)
-- ============================================================
CREATE TABLE url_scores (
  url_id UUID REFERENCES urls(id) ON DELETE CASCADE PRIMARY KEY,
  mindblown_count INT DEFAULT 0,
  yawn_count INT DEFAULT 0,
  save_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  score FLOAT DEFAULT 0,
  score_weighted FLOAT DEFAULT 0,
  last_computed TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scores_ranked ON url_scores (score_weighted DESC);

-- ============================================================
-- 8. User Reputation (Phase 2)
-- ============================================================
CREATE TABLE user_rep (
  user_id TEXT PRIMARY KEY,
  rep_score FLOAT DEFAULT 0,
  rep_confidence FLOAT DEFAULT 0,
  total_reactions INT DEFAULT 0,
  accurate_reactions INT DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rep ENABLE ROW LEVEL SECURITY;

-- Policies: permissive for now (tighten with auth later)
CREATE POLICY "allow_all" ON urls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON url_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON vault_saves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON url_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON dead_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON blocked_domains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON url_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON user_rep FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SCORE REFRESH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_url_scores()
RETURNS void AS $$
BEGIN
  INSERT INTO url_scores (url_id, mindblown_count, yawn_count, save_count, click_count, score, score_weighted, last_computed)
  SELECT
    u.id,
    COALESCE(mb.cnt, 0),
    COALESCE(yw.cnt, 0),
    COALESCE(sv.cnt, 0),
    COALESCE(cl.cnt, 0),
    (COALESCE(mb.cnt, 0) * 2) - (COALESCE(yw.cnt, 0) * 1),
    ((COALESCE(mb.cnt, 0) * 2) - (COALESCE(yw.cnt, 0) * 1))
      * (1.0 / (1.0 + 0.15 * EXTRACT(EPOCH FROM (now() - u.created_at)) / 86400.0)),
    now()
  FROM urls u
  LEFT JOIN (SELECT url_id, COUNT(*) as cnt FROM url_events WHERE event_type = 'mindblown' GROUP BY url_id) mb ON mb.url_id = u.id
  LEFT JOIN (SELECT url_id, COUNT(*) as cnt FROM url_events WHERE event_type = 'yawn' GROUP BY url_id) yw ON yw.url_id = u.id
  LEFT JOIN (SELECT url_id, COUNT(*) as cnt FROM vault_saves GROUP BY url_id) sv ON sv.url_id = u.id
  LEFT JOIN (SELECT url_id, COUNT(*) as cnt FROM url_events WHERE event_type = 'click' GROUP BY url_id) cl ON cl.url_id = u.id
  WHERE u.is_dead = false
  ON CONFLICT (url_id) DO UPDATE SET
    mindblown_count = EXCLUDED.mindblown_count,
    yawn_count = EXCLUDED.yawn_count,
    save_count = EXCLUDED.save_count,
    click_count = EXCLUDED.click_count,
    score = EXCLUDED.score,
    score_weighted = EXCLUDED.score_weighted,
    last_computed = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- DONE! You should see "Success. No rows returned."
-- ============================================================
