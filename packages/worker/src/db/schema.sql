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
