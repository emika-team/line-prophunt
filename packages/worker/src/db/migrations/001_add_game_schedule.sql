-- Migration: Add start_at and end_at columns to games table
-- Run: wrangler d1 execute prophunt-db --remote --file=./src/db/migrations/001_add_game_schedule.sql

ALTER TABLE games ADD COLUMN start_at TEXT;
ALTER TABLE games ADD COLUMN end_at TEXT;

-- Index for querying active games by time
CREATE INDEX IF NOT EXISTS idx_games_schedule ON games(start_at, end_at);
