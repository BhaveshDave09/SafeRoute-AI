-- ============================================================
-- SafeRoute AI — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: incidents
-- Stores user-reported safety incidents with geo-coordinates
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  incident_type VARCHAR(100)     NOT NULL,
  severity      VARCHAR(20)      NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  description   TEXT,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Index for fast geo-queries
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lng    ON incidents (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_severity   ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);

-- ============================================================
-- TABLE: route_analysis
-- Stores results of AI route safety analysis requests
-- ============================================================
CREATE TABLE IF NOT EXISTS route_analysis (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_location JSONB            NOT NULL, -- { name, latitude, longitude }
  destination    JSONB            NOT NULL, -- { name, latitude, longitude }
  safety_score   INTEGER          NOT NULL CHECK (safety_score BETWEEN 0 AND 100),
  risk_level     VARCHAR(20)      NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  ai_summary     TEXT             NOT NULL,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_analysis_created_at ON route_analysis (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_analysis_risk_level ON route_analysis (risk_level);

-- ============================================================
-- TABLE: sos_logs
-- Stores emergency SOS alerts with user location + message
-- ============================================================
CREATE TABLE IF NOT EXISTS sos_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  latitude     DOUBLE PRECISION NOT NULL,
  longitude    DOUBLE PRECISION NOT NULL,
  user_message TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_logs_created_at ON sos_logs (created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- For hackathon/demo: allow all authenticated & anon reads.
-- Tighten per production requirements later.
-- ============================================================
ALTER TABLE incidents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_logs       ENABLE ROW LEVEL SECURITY;

-- Allow public read on incidents
CREATE POLICY "incidents_read_all"
  ON incidents FOR SELECT USING (true);

-- Allow public insert on incidents
CREATE POLICY "incidents_insert_all"
  ON incidents FOR INSERT WITH CHECK (true);

-- Allow public read on route_analysis
CREATE POLICY "route_analysis_read_all"
  ON route_analysis FOR SELECT USING (true);

-- Allow public insert on route_analysis
CREATE POLICY "route_analysis_insert_all"
  ON route_analysis FOR INSERT WITH CHECK (true);

-- Allow public read on sos_logs
CREATE POLICY "sos_logs_read_all"
  ON sos_logs FOR SELECT USING (true);

-- Allow public insert on sos_logs
CREATE POLICY "sos_logs_insert_all"
  ON sos_logs FOR INSERT WITH CHECK (true);

-- ============================================================
-- SAMPLE SEED DATA (optional — uncomment to populate demo data)
-- ============================================================
/*
INSERT INTO incidents (latitude, longitude, incident_type, severity, description) VALUES
  (28.6139, 77.2090, 'Theft',          'high',   'Reported bag snatching near metro gate'),
  (28.6200, 77.2100, 'Harassment',     'medium', 'Verbal harassment incident at bus stop'),
  (28.6050, 77.2200, 'Poor Lighting',  'low',    'Street lights not working after 10 PM'),
  (28.6300, 77.1950, 'Assault',        'high',   'Physical assault reported near park'),
  (28.6180, 77.2080, 'Vandalism',      'low',    'Public property damage observed');

INSERT INTO sos_logs (latitude, longitude, user_message) VALUES
  (28.6139, 77.2090, 'I feel unsafe, please help'),
  (28.6200, 77.2100, 'Suspicious person following me');
*/
