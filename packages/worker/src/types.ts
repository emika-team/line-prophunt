export interface Env {
  DB: D1Database;
  OUTBOUND_API_URL: string;
  OUTBOUND_API_TOKEN: string;
  OUTBOUND_CALLBACK_URL: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  // Redemption API (optional)
  REDEMPTION_API_URL?: string;
  REDEMPTION_API_KEY?: string;
  REDEMPTION_WIN_TAG_ID?: string;
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
  mission_tag_id: number | null;
  win_message_config: string | null; // JSON: { reward, message, buttonText, buttonUrl }
  lose_message_config: string | null; // JSON: { message, buttonText, buttonUrl }
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

// ============ Broadcast System Types ============

export interface Channel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_secret: string | null;
  access_token: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  channel_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  player_id: string;
  created_at: string;
}

export type BroadcastTargetType = 'all' | 'channel' | 'group' | 'custom';
export type BroadcastStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface BroadcastJob {
  id: string;
  game_id: string;
  target_type: BroadcastTargetType;
  target_id: string | null;
  custom_keys: string | null; // JSON array
  custom_message: string | null;
  status: BroadcastStatus;
  total_recipients: number;
  processed: number;
  sent: number;
  failed: number;
  error_message: string | null;
  batch_size: number;
  current_offset: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BroadcastResult {
  id: string;
  job_id: string;
  custom_key: string;
  success: number;
  error_message: string | null;
  sent_at: string;
}
