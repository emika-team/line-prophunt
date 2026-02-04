export interface Env {
  DB: D1Database;
  OUTBOUND_API_URL: string;
  OUTBOUND_API_TOKEN: string;
  OUTBOUND_CALLBACK_URL: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
}

// Database types
export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  type: 'grid_2x2' | 'question_1_3' | 'tap_zone' | 'compare_1x2';
  header: string; // JSON
  content: string; // JSON
  clickable_areas: string; // JSON
  total_zones: number;
  single_attempt: number;
  template_image_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  name: string;
  template_id: string;
  image_url: string;
  image_width: number;
  image_height: number;
  correct_position: number;
  custom_zone: string | null; // JSON
  win_callback_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  customer_id: string;
  custom_key: string | null;
  display_name: string;
  group_id: string;
  state: 'IDLE' | 'PLAYING' | 'ANSWERED';
  current_game_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameSession {
  id: string;
  player_id: string;
  game_id: string;
  group_id: string;
  answer: number | null;
  is_correct: number | null;
  reward_status: 'PENDING' | 'PAID' | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

// API types
export interface ClickableArea {
  position: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeaderConfig {
  title: string;
  subtitle?: string;
  bgColor: string;
  textColor: string;
  height: number;
}

export interface ContentConfig {
  layout: string;
  labels?: string[];
  borderRadius?: number;
  gap?: number;
}

export interface CustomZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Webhook payload from chatapi
export interface WebhookPayload {
  event: string;
  data?: string; // postback data: "action=answer&position=1&gameId=xxx"
  key_value?: string; // customKey
  customer_udid?: string;
  channel_id?: string;
  raw?: unknown;
}
