import type { Group, GroupMember, Player } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

export class GroupService {
  constructor(private db: D1Database) {}

  // ============ Group CRUD ============

  async findAllGroups(channelId?: string): Promise<(Group & { memberCount: number })[]> {
    let query = `
      SELECT g.*, COUNT(gm.player_id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.is_active = 1
    `;
    const values: unknown[] = [];

    if (channelId) {
      query += ' AND g.channel_id = ?';
      values.push(channelId);
    }

    query += ' GROUP BY g.id ORDER BY g.created_at DESC';

    const stmt = this.db.prepare(query);
    const result = await (values.length > 0 ? stmt.bind(...values) : stmt).all<Group & { member_count: number }>();

    return result.results.map((g) => ({
      ...g,
      memberCount: g.member_count,
    }));
  }

  async findGroupById(id: string): Promise<(Group & { memberCount: number }) | null> {
    const row = await this.db
      .prepare(
        `SELECT g.*, COUNT(gm.player_id) as member_count
         FROM groups g
         LEFT JOIN group_members gm ON g.id = gm.group_id
         WHERE g.id = ?
         GROUP BY g.id`
      )
      .bind(id)
      .first<Group & { member_count: number }>();

    if (!row) return null;

    return {
      ...row,
      memberCount: row.member_count,
    };
  }

  async createGroup(data: {
    name: string;
    description?: string;
    channelId?: string;
  }): Promise<Group> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO groups (id, name, description, channel_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, data.name, data.description || null, data.channelId || null, now, now)
      .run();

    return (await this.findGroupById(id))!;
  }

  async updateGroup(
    id: string,
    data: Partial<{ name: string; description: string; channelId: string; isActive: boolean }>
  ): Promise<(Group & { memberCount: number }) | null> {
    const existing = await this.findGroupById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.channelId !== undefined) {
      updates.push('channel_id = ?');
      values.push(data.channelId);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await this.db
      .prepare(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findGroupById(id);
  }

  async deleteGroup(id: string): Promise<boolean> {
    // Delete members first (cascade should handle this, but be explicit)
    await this.db.prepare('DELETE FROM group_members WHERE group_id = ?').bind(id).run();
    const result = await this.db.prepare('DELETE FROM groups WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  // ============ Group Members ============

  async getGroupMembers(groupId: string): Promise<Player[]> {
    const result = await this.db
      .prepare(
        `SELECT p.* FROM players p
         INNER JOIN group_members gm ON p.id = gm.player_id
         WHERE gm.group_id = ?
         ORDER BY gm.created_at DESC`
      )
      .bind(groupId)
      .all<Player>();

    return result.results;
  }

  async getGroupMemberCustomKeys(groupId: string): Promise<string[]> {
    const result = await this.db
      .prepare(
        `SELECT p.custom_key FROM players p
         INNER JOIN group_members gm ON p.id = gm.player_id
         WHERE gm.group_id = ? AND p.custom_key IS NOT NULL`
      )
      .bind(groupId)
      .all<{ custom_key: string }>();

    return result.results.map((r) => r.custom_key);
  }

  async addMember(groupId: string, playerId: string): Promise<GroupMember> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare('INSERT OR IGNORE INTO group_members (id, group_id, player_id, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, groupId, playerId, now)
      .run();

    return {
      id,
      group_id: groupId,
      player_id: playerId,
      created_at: now,
    };
  }

  async addMemberByCustomKey(groupId: string, customKey: string): Promise<GroupMember | null> {
    const player = await this.db
      .prepare('SELECT id FROM players WHERE custom_key = ?')
      .bind(customKey)
      .first<{ id: string }>();

    if (!player) return null;

    return this.addMember(groupId, player.id);
  }

  async addMembersInBulk(groupId: string, playerIds: string[]): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;

    for (const playerId of playerIds) {
      try {
        const id = generateId();
        const now = new Date().toISOString();
        const result = await this.db
          .prepare('INSERT OR IGNORE INTO group_members (id, group_id, player_id, created_at) VALUES (?, ?, ?, ?)')
          .bind(id, groupId, playerId, now)
          .run();

        if (result.meta.changes > 0) {
          added++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    return { added, skipped };
  }

  async addMembersByCustomKeys(
    groupId: string,
    customKeys: string[]
  ): Promise<{ added: number; skipped: number; notFound: number }> {
    let added = 0;
    let skipped = 0;
    let notFound = 0;

    for (const customKey of customKeys) {
      const player = await this.db
        .prepare('SELECT id FROM players WHERE custom_key = ?')
        .bind(customKey)
        .first<{ id: string }>();

      if (!player) {
        notFound++;
        continue;
      }

      try {
        const id = generateId();
        const now = new Date().toISOString();
        const result = await this.db
          .prepare('INSERT OR IGNORE INTO group_members (id, group_id, player_id, created_at) VALUES (?, ?, ?, ?)')
          .bind(id, groupId, player.id, now)
          .run();

        if (result.meta.changes > 0) {
          added++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    return { added, skipped, notFound };
  }

  async removeMember(groupId: string, playerId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM group_members WHERE group_id = ? AND player_id = ?')
      .bind(groupId, playerId)
      .run();

    return result.meta.changes > 0;
  }

  async removeMemberByCustomKey(groupId: string, customKey: string): Promise<boolean> {
    const player = await this.db
      .prepare('SELECT id FROM players WHERE custom_key = ?')
      .bind(customKey)
      .first<{ id: string }>();

    if (!player) return false;

    return this.removeMember(groupId, player.id);
  }

  async clearGroupMembers(groupId: string): Promise<number> {
    const result = await this.db.prepare('DELETE FROM group_members WHERE group_id = ?').bind(groupId).run();

    return result.meta.changes;
  }

  async isPlayerInGroup(groupId: string, playerId: string): Promise<boolean> {
    const member = await this.db
      .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND player_id = ?')
      .bind(groupId, playerId)
      .first();

    return !!member;
  }

  async getPlayerGroups(playerId: string): Promise<Group[]> {
    const result = await this.db
      .prepare(
        `SELECT g.* FROM groups g
         INNER JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.player_id = ? AND g.is_active = 1
         ORDER BY g.name`
      )
      .bind(playerId)
      .all<Group>();

    return result.results;
  }
}
