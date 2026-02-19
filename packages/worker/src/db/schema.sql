-- Game Templates
CREATE TABLE IF NOT EXISTS game_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('grid_2x2', 'question_1_3', 'tap_zone', 'compare_1x2')),
  header TEXT NOT NULL,
  content TEXT NOT NULL,
  clickable_areas TEXT NOT NULL,
  total_zones INTEGER NOT NULL,
  single_attempt INTEGER DEFAULT 0,
  template_image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_width INTEGER DEFAULT 1040,
  image_height INTEGER DEFAULT 1040,
  correct_position INTEGER NOT NULL,
  custom_zone TEXT,
  win_callback_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES game_templates(id)
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  custom_key TEXT,
  display_name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  state TEXT DEFAULT 'IDLE' CHECK(state IN ('IDLE', 'PLAYING', 'ANSWERED')),
  current_game_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(customer_id, group_id)
);

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  answer INTEGER,
  is_correct INTEGER,
  reward_status TEXT CHECK(reward_status IS NULL OR reward_status IN ('PENDING', 'PAID')),
  answered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_custom_key ON players(custom_key);
CREATE INDEX IF NOT EXISTS idx_players_group_id ON players(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_player_game ON game_sessions(player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group ON game_sessions(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_correct_reward ON game_sessions(is_correct, reward_status);
CREATE INDEX IF NOT EXISTS idx_games_template ON games(template_id);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);

-- ============ Broadcast System ============

-- LINE Channels (LINE OA accounts)
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  channel_name TEXT NOT NULL,
  channel_secret TEXT,
  access_token TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- User Groups (segments for targeting)
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

-- Group Members (many-to-many: players <-> groups)
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(group_id, player_id),
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Broadcast Jobs (job queue for async processing)
CREATE TABLE IF NOT EXISTS broadcast_jobs (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('all', 'channel', 'group', 'custom')),
  target_id TEXT,
  custom_keys TEXT,
  custom_message TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  total_recipients INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  sent INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  error_message TEXT,
  batch_size INTEGER DEFAULT 50,
  current_offset INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Broadcast Results (individual send results)
CREATE TABLE IF NOT EXISTS broadcast_results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  custom_key TEXT NOT NULL,
  success INTEGER NOT NULL,
  error_message TEXT,
  sent_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES broadcast_jobs(id) ON DELETE CASCADE
);

-- Indexes for broadcast system
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_groups_channel ON groups(channel_id);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_player ON group_members(player_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_status ON broadcast_jobs(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_game ON broadcast_jobs(game_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_results_job ON broadcast_results(job_id);
