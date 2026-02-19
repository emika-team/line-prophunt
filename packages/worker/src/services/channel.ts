import type { Channel, Player } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

export class ChannelService {
  constructor(private db: D1Database) {}

  // ============ Channel CRUD ============

  async findAllChannels(): Promise<(Channel & { playerCount: number })[]> {
    const result = await this.db
      .prepare(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM players p WHERE p.group_id LIKE '%' || c.channel_id || '%') as player_count
         FROM channels c
         WHERE c.is_active = 1
         ORDER BY c.created_at DESC`
      )
      .all<Channel & { player_count: number }>();

    return result.results.map((c) => ({
      ...c,
      playerCount: c.player_count,
    }));
  }

  async findChannelById(id: string): Promise<Channel | null> {
    return this.db.prepare('SELECT * FROM channels WHERE id = ?').bind(id).first<Channel>();
  }

  async findChannelByChannelId(channelId: string): Promise<Channel | null> {
    return this.db.prepare('SELECT * FROM channels WHERE channel_id = ?').bind(channelId).first<Channel>();
  }

  async createChannel(data: {
    channelId: string;
    channelName: string;
    channelSecret?: string;
    accessToken?: string;
  }): Promise<Channel> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO channels (id, channel_id, channel_name, channel_secret, access_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.channelId,
        data.channelName,
        data.channelSecret || null,
        data.accessToken || null,
        now,
        now
      )
      .run();

    return (await this.findChannelById(id))!;
  }

  async updateChannel(
    id: string,
    data: Partial<{
      channelId: string;
      channelName: string;
      channelSecret: string;
      accessToken: string;
      isActive: boolean;
    }>
  ): Promise<Channel | null> {
    const existing = await this.findChannelById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.channelId !== undefined) {
      updates.push('channel_id = ?');
      values.push(data.channelId);
    }
    if (data.channelName !== undefined) {
      updates.push('channel_name = ?');
      values.push(data.channelName);
    }
    if (data.channelSecret !== undefined) {
      updates.push('channel_secret = ?');
      values.push(data.channelSecret);
    }
    if (data.accessToken !== undefined) {
      updates.push('access_token = ?');
      values.push(data.accessToken);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await this.db
      .prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findChannelById(id);
  }

  async deleteChannel(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM channels WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  // ============ Channel Players ============

  /**
   * Get all players that have interacted with this channel
   * This uses the group_id field which currently stores channel context
   */
  async getChannelPlayers(channelId: string): Promise<Player[]> {
    // Players are associated with channels via their group_id field
    // We need to query players whose group_id matches the channel
    const result = await this.db
      .prepare(
        `SELECT * FROM players 
         WHERE group_id LIKE ? OR group_id = ?
         ORDER BY created_at DESC`
      )
      .bind(`%${channelId}%`, channelId)
      .all<Player>();

    return result.results;
  }

  /**
   * Get custom keys for all players in a channel
   */
  async getChannelPlayerCustomKeys(channelId: string): Promise<string[]> {
    const result = await this.db
      .prepare(
        `SELECT custom_key FROM players 
         WHERE (group_id LIKE ? OR group_id = ?) AND custom_key IS NOT NULL`
      )
      .bind(`%${channelId}%`, channelId)
      .all<{ custom_key: string }>();

    return result.results.map((r) => r.custom_key);
  }
}
