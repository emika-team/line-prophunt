import type { Env, Game, GameTemplate, Player, GameSession, ClickableArea } from '../types';
import { OutboundService } from './outbound';

function generateId(): string {
  return crypto.randomUUID();
}

export class GameService {
  private outbound: OutboundService;

  constructor(private db: D1Database, private env: Env) {
    this.outbound = new OutboundService(env);
  }

  // ============ Postback Handler ============

  async handlePostbackAnswer(
    customKey: string,
    position: number,
    gameId: string
  ): Promise<void> {
    // Find game with template
    const game = await this.db
      .prepare(
        `SELECT g.*, t.clickable_areas, t.type as template_type, t.total_zones 
         FROM games g 
         JOIN game_templates t ON g.template_id = t.id 
         WHERE g.id = ?`
      )
      .bind(gameId)
      .first<Game & { clickable_areas: string; template_type: string; total_zones: number }>();

    if (!game) {
      await this.outbound.sendText(customKey, 'เกมนี้ไม่มีแล้ว');
      return;
    }

    // Get or create player
    let player = await this.db
      .prepare('SELECT * FROM players WHERE custom_key = ?')
      .bind(customKey)
      .first<Player>();

    if (!player) {
      const playerId = generateId();
      await this.db
        .prepare(
          `INSERT INTO players (id, customer_id, custom_key, display_name, group_id, state)
           VALUES (?, ?, ?, ?, ?, 'PLAYING')`
        )
        .bind(playerId, customKey, customKey, customKey, 'postback')
        .run();

      player = {
        id: playerId,
        customer_id: customKey,
        custom_key: customKey,
        display_name: customKey,
        group_id: 'postback',
        state: 'PLAYING',
        current_game_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Get or create session
    let session = await this.db
      .prepare('SELECT * FROM game_sessions WHERE player_id = ? AND game_id = ?')
      .bind(player.id, game.id)
      .first<GameSession>();

    if (!session) {
      const sessionId = generateId();
      await this.db
        .prepare(
          `INSERT INTO game_sessions (id, player_id, game_id, group_id)
           VALUES (?, ?, ?, ?)`
        )
        .bind(sessionId, player.id, game.id, player.group_id || 'postback')
        .run();

      session = {
        id: sessionId,
        player_id: player.id,
        game_id: game.id,
        group_id: player.group_id || 'postback',
        answer: null,
        is_correct: null,
        reward_status: null,
        answered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Check if already answered
    if (session.answer !== null) {
      await this.outbound.sendText(customKey, 'คุณได้ตอบเกมนี้แล้ว ขอบคุณที่ร่วมสนุก!');
      return;
    }

    const isCorrect = position === game.correct_position;
    const answeredAt = new Date().toISOString();

    // Update session
    await this.db
      .prepare(
        `UPDATE game_sessions 
         SET answer = ?, is_correct = ?, reward_status = ?, answered_at = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(position, isCorrect ? 1 : 0, isCorrect ? 'PENDING' : null, answeredAt, session.id)
      .run();

    // Update player state
    await this.db
      .prepare(
        `UPDATE players SET state = 'ANSWERED', current_game_id = NULL, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(player.id)
      .run();

    // Send win callback if configured
    if (isCorrect && game.win_callback_url) {
      await this.outbound.sendWinCallback(game.win_callback_url, {
        customKey,
        gameId,
        gameName: game.name,
        answeredAt: new Date(answeredAt),
      });
    }

    // Send result
    const resultFlex = this.outbound.createGameResultFlex(
      isCorrect,
      isCorrect ? 'ตอบถูกแล้ว! รอ admin แจ้งรางวัลนะ' : 'ตอบผิด ลองเกมหน้านะ!'
    );

    await this.outbound.sendFlex(
      customKey,
      resultFlex,
      isCorrect ? 'ยินดีด้วย! ตอบถูก!' : 'เสียใจด้วย ตอบผิด'
    );
  }

  // ============ Template CRUD ============

  async findAllTemplates(): Promise<GameTemplate[]> {
    const result = await this.db
      .prepare('SELECT * FROM game_templates WHERE is_active = 1 ORDER BY created_at DESC')
      .all<GameTemplate>();
    return result.results;
  }

  async findTemplateById(id: string): Promise<GameTemplate | null> {
    return this.db.prepare('SELECT * FROM game_templates WHERE id = ?').bind(id).first<GameTemplate>();
  }

  async createTemplate(data: {
    name: string;
    description: string;
    type: string;
    header: object;
    content: object;
    clickableAreas: ClickableArea[];
    totalZones: number;
    singleAttempt?: boolean;
    templateImageUrl?: string;
  }): Promise<GameTemplate> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO game_templates 
         (id, name, description, type, header, content, clickable_areas, total_zones, single_attempt, template_image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.description,
        data.type,
        JSON.stringify(data.header),
        JSON.stringify(data.content),
        JSON.stringify(data.clickableAreas),
        data.totalZones,
        data.singleAttempt ? 1 : 0,
        data.templateImageUrl || null,
        now,
        now
      )
      .run();

    return (await this.findTemplateById(id))!;
  }

  async updateTemplate(id: string, data: Partial<{
    name: string;
    description: string;
    type: string;
    header: object;
    content: object;
    clickableAreas: ClickableArea[];
    totalZones: number;
    singleAttempt: boolean;
    templateImageUrl: string;
  }>): Promise<GameTemplate | null> {
    const existing = await this.findTemplateById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }
    if (data.header !== undefined) { updates.push('header = ?'); values.push(JSON.stringify(data.header)); }
    if (data.content !== undefined) { updates.push('content = ?'); values.push(JSON.stringify(data.content)); }
    if (data.clickableAreas !== undefined) { updates.push('clickable_areas = ?'); values.push(JSON.stringify(data.clickableAreas)); }
    if (data.totalZones !== undefined) { updates.push('total_zones = ?'); values.push(data.totalZones); }
    if (data.singleAttempt !== undefined) { updates.push('single_attempt = ?'); values.push(data.singleAttempt ? 1 : 0); }
    if (data.templateImageUrl !== undefined) { updates.push('template_image_url = ?'); values.push(data.templateImageUrl); }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await this.db
      .prepare(`UPDATE game_templates SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findTemplateById(id);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM game_templates WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  // ============ Game CRUD ============

  async findAllGames(): Promise<(Game & { template?: GameTemplate })[]> {
    const result = await this.db
      .prepare(
        `SELECT g.*, t.id as t_id, t.name as t_name, t.description as t_description, 
                t.type as t_type, t.header as t_header, t.content as t_content,
                t.clickable_areas as t_clickable_areas, t.total_zones as t_total_zones,
                t.single_attempt as t_single_attempt, t.template_image_url as t_template_image_url,
                t.is_active as t_is_active, t.created_at as t_created_at, t.updated_at as t_updated_at
         FROM games g 
         LEFT JOIN game_templates t ON g.template_id = t.id 
         ORDER BY g.created_at DESC`
      )
      .all<Game & Record<string, unknown>>();

    return result.results.map((row) => {
      const game: Game & { template?: GameTemplate } = {
        id: row.id,
        name: row.name,
        template_id: row.template_id,
        image_url: row.image_url,
        image_width: row.image_width,
        image_height: row.image_height,
        correct_position: row.correct_position,
        custom_zone: row.custom_zone,
        win_callback_url: row.win_callback_url,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      if (row.t_id) {
        game.template = {
          id: row.t_id as string,
          name: row.t_name as string,
          description: row.t_description as string,
          type: row.t_type as GameTemplate['type'],
          header: row.t_header as string,
          content: row.t_content as string,
          clickable_areas: row.t_clickable_areas as string,
          total_zones: row.t_total_zones as number,
          single_attempt: row.t_single_attempt as number,
          template_image_url: row.t_template_image_url as string | null,
          is_active: row.t_is_active as number,
          created_at: row.t_created_at as string,
          updated_at: row.t_updated_at as string,
        };
      }

      return game;
    });
  }

  async findGameById(id: string): Promise<(Game & { template?: GameTemplate }) | null> {
    const row = await this.db
      .prepare(
        `SELECT g.*, t.id as t_id, t.name as t_name, t.description as t_description, 
                t.type as t_type, t.header as t_header, t.content as t_content,
                t.clickable_areas as t_clickable_areas, t.total_zones as t_total_zones,
                t.single_attempt as t_single_attempt, t.template_image_url as t_template_image_url,
                t.is_active as t_is_active, t.created_at as t_created_at, t.updated_at as t_updated_at
         FROM games g 
         LEFT JOIN game_templates t ON g.template_id = t.id 
         WHERE g.id = ?`
      )
      .bind(id)
      .first<Game & Record<string, unknown>>();

    if (!row) return null;

    const game: Game & { template?: GameTemplate } = {
      id: row.id,
      name: row.name,
      template_id: row.template_id,
      image_url: row.image_url,
      image_width: row.image_width,
      image_height: row.image_height,
      correct_position: row.correct_position,
      custom_zone: row.custom_zone,
      win_callback_url: row.win_callback_url,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    if (row.t_id) {
      game.template = {
        id: row.t_id as string,
        name: row.t_name as string,
        description: row.t_description as string,
        type: row.t_type as GameTemplate['type'],
        header: row.t_header as string,
        content: row.t_content as string,
        clickable_areas: row.t_clickable_areas as string,
        total_zones: row.t_total_zones as number,
        single_attempt: row.t_single_attempt as number,
        template_image_url: row.t_template_image_url as string | null,
        is_active: row.t_is_active as number,
        created_at: row.t_created_at as string,
        updated_at: row.t_updated_at as string,
      };
    }

    return game;
  }

  async createGame(data: {
    name: string;
    templateId: string;
    imageUrl: string;
    imageWidth?: number;
    imageHeight?: number;
    correctPosition: number;
    customZone?: object;
    winCallbackUrl?: string;
  }): Promise<Game> {
    // Validate template
    const template = await this.findTemplateById(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (data.correctPosition > template.total_zones) {
      throw new Error(`correctPosition must be between 1 and ${template.total_zones}`);
    }

    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO games 
         (id, name, template_id, image_url, image_width, image_height, correct_position, custom_zone, win_callback_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.templateId,
        data.imageUrl,
        data.imageWidth || 1040,
        data.imageHeight || 1040,
        data.correctPosition,
        data.customZone ? JSON.stringify(data.customZone) : null,
        data.winCallbackUrl || null,
        now,
        now
      )
      .run();

    return (await this.findGameById(id))!;
  }

  async updateGame(id: string, data: Partial<{
    name: string;
    templateId: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    correctPosition: number;
    customZone: object;
    winCallbackUrl: string;
    isActive: boolean;
  }>): Promise<Game | null> {
    const existing = await this.findGameById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.templateId !== undefined) { updates.push('template_id = ?'); values.push(data.templateId); }
    if (data.imageUrl !== undefined) { updates.push('image_url = ?'); values.push(data.imageUrl); }
    if (data.imageWidth !== undefined) { updates.push('image_width = ?'); values.push(data.imageWidth); }
    if (data.imageHeight !== undefined) { updates.push('image_height = ?'); values.push(data.imageHeight); }
    if (data.correctPosition !== undefined) { updates.push('correct_position = ?'); values.push(data.correctPosition); }
    if (data.customZone !== undefined) { updates.push('custom_zone = ?'); values.push(JSON.stringify(data.customZone)); }
    if (data.winCallbackUrl !== undefined) { updates.push('win_callback_url = ?'); values.push(data.winCallbackUrl); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await this.db
      .prepare(`UPDATE games SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findGameById(id);
  }

  async deleteGame(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM games WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  // ============ Session & Stats ============

  async findAllSessions(filters?: {
    isCorrect?: boolean;
    rewardStatus?: string;
    groupId?: string;
  }): Promise<(GameSession & { player?: Player; game?: Game })[]> {
    let query = `
      SELECT s.*, 
             p.id as p_id, p.customer_id as p_customer_id, p.custom_key as p_custom_key,
             p.display_name as p_display_name, p.group_id as p_group_id, p.state as p_state,
             g.id as g_id, g.name as g_name, g.image_url as g_image_url
      FROM game_sessions s
      LEFT JOIN players p ON s.player_id = p.id
      LEFT JOIN games g ON s.game_id = g.id
      WHERE 1=1
    `;
    const values: unknown[] = [];

    if (filters?.isCorrect !== undefined) {
      query += ' AND s.is_correct = ?';
      values.push(filters.isCorrect ? 1 : 0);
    }
    if (filters?.rewardStatus) {
      query += ' AND s.reward_status = ?';
      values.push(filters.rewardStatus);
    }
    if (filters?.groupId) {
      query += ' AND s.group_id = ?';
      values.push(filters.groupId);
    }

    query += ' ORDER BY s.created_at DESC';

    const stmt = this.db.prepare(query);
    const result = await (values.length > 0 ? stmt.bind(...values) : stmt).all<GameSession & Record<string, unknown>>();

    return result.results.map((row) => ({
      id: row.id,
      player_id: row.player_id,
      game_id: row.game_id,
      group_id: row.group_id,
      answer: row.answer,
      is_correct: row.is_correct,
      reward_status: row.reward_status,
      answered_at: row.answered_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      player: row.p_id ? {
        id: row.p_id as string,
        customer_id: row.p_customer_id as string,
        custom_key: row.p_custom_key as string | null,
        display_name: row.p_display_name as string,
        group_id: row.p_group_id as string,
        state: row.p_state as Player['state'],
        current_game_id: null,
        created_at: '',
        updated_at: '',
      } : undefined,
      game: row.g_id ? {
        id: row.g_id as string,
        name: row.g_name as string,
        template_id: '',
        image_url: row.g_image_url as string,
        image_width: 1040,
        image_height: 1040,
        correct_position: 0,
        custom_zone: null,
        win_callback_url: null,
        is_active: 1,
        created_at: '',
        updated_at: '',
      } : undefined,
    }));
  }

  async updateSessionRewardStatus(id: string, status: 'PENDING' | 'PAID'): Promise<GameSession | null> {
    await this.db
      .prepare("UPDATE game_sessions SET reward_status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id)
      .run();

    return this.db.prepare('SELECT * FROM game_sessions WHERE id = ?').bind(id).first<GameSession>();
  }

  async getDashboardStats(groupId?: string): Promise<{
    totalPlayers: number;
    totalSessions: number;
    totalWinners: number;
    winRate: number;
  }> {
    const playersQuery = groupId
      ? this.db.prepare('SELECT COUNT(*) as count FROM players WHERE group_id = ?').bind(groupId)
      : this.db.prepare('SELECT COUNT(*) as count FROM players');

    const sessionsQuery = groupId
      ? this.db.prepare('SELECT COUNT(*) as count FROM game_sessions WHERE group_id = ? AND answer IS NOT NULL').bind(groupId)
      : this.db.prepare('SELECT COUNT(*) as count FROM game_sessions WHERE answer IS NOT NULL');

    const winnersQuery = groupId
      ? this.db.prepare('SELECT COUNT(*) as count FROM game_sessions WHERE group_id = ? AND is_correct = 1').bind(groupId)
      : this.db.prepare('SELECT COUNT(*) as count FROM game_sessions WHERE is_correct = 1');

    const [playersResult, sessionsResult, winnersResult] = await Promise.all([
      playersQuery.first<{ count: number }>(),
      sessionsQuery.first<{ count: number }>(),
      winnersQuery.first<{ count: number }>(),
    ]);

    const totalPlayers = playersResult?.count || 0;
    const totalSessions = sessionsResult?.count || 0;
    const totalWinners = winnersResult?.count || 0;

    return {
      totalPlayers,
      totalSessions,
      totalWinners,
      winRate: totalSessions > 0 ? (totalWinners / totalSessions) * 100 : 0,
    };
  }

  async findAllPlayers(groupId?: string): Promise<Player[]> {
    const query = groupId
      ? this.db.prepare('SELECT * FROM players WHERE group_id = ? ORDER BY created_at DESC').bind(groupId)
      : this.db.prepare('SELECT * FROM players ORDER BY created_at DESC');

    const result = await query.all<Player>();
    return result.results;
  }

  // ============ Broadcast ============

  async broadcastGame(
    gameId: string,
    customKeys: string[],
    customMessage?: string,
    groupId?: string
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    sessionsCreated: number;
    results: Array<{ customKey: string; success: boolean; error?: string }>;
  }> {
    const game = await this.findGameById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const template = game.template;
    if (!template) {
      throw new Error('Template not found');
    }

    const results: Array<{ customKey: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    let sessionsCreated = 0;

    // Determine clickable areas
    let clickableAreas: ClickableArea[] = JSON.parse(template.clickable_areas);
    if (template.type === 'tap_zone' && game.custom_zone) {
      const customZone = JSON.parse(game.custom_zone);
      clickableAreas = [{ position: 1, ...customZone }];
    }

    const flexContent = this.outbound.createGameFlexWithOverlay(
      game.image_url,
      game.image_width,
      game.image_height,
      clickableAreas,
      gameId
    );

    const altText = customMessage || `เกม ${game.name}`;
    const broadcastGroupId = groupId || 'broadcast';

    for (const customKey of customKeys) {
      try {
        // Get or create player
        let player = await this.db
          .prepare('SELECT * FROM players WHERE custom_key = ?')
          .bind(customKey)
          .first<Player>();

        if (!player) {
          const playerId = generateId();
          await this.db
            .prepare(
              `INSERT INTO players (id, customer_id, custom_key, display_name, group_id, state)
               VALUES (?, ?, ?, ?, ?, 'PLAYING')`
            )
            .bind(playerId, customKey, customKey, customKey, broadcastGroupId)
            .run();

          player = {
            id: playerId,
            customer_id: customKey,
            custom_key: customKey,
            display_name: customKey,
            group_id: broadcastGroupId,
            state: 'PLAYING',
            current_game_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        // Check existing session
        const existingSession = await this.db
          .prepare('SELECT * FROM game_sessions WHERE player_id = ? AND game_id = ?')
          .bind(player.id, game.id)
          .first<GameSession>();

        if (!existingSession) {
          const sessionId = generateId();
          await this.db
            .prepare(
              `INSERT INTO game_sessions (id, player_id, game_id, group_id)
               VALUES (?, ?, ?, ?)`
            )
            .bind(sessionId, player.id, game.id, broadcastGroupId)
            .run();
          sessionsCreated++;

          await this.db
            .prepare("UPDATE players SET state = 'PLAYING', current_game_id = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(gameId, player.id)
            .run();
        }

        // Send flex
        const result = await this.outbound.sendFlex(customKey, flexContent, altText);

        if (result.success) {
          sent++;
          results.push({ customKey, success: true });
        } else {
          failed++;
          results.push({ customKey, success: false, error: result.error?.message || 'Unknown error' });
        }
      } catch (error) {
        failed++;
        results.push({
          customKey,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { total: customKeys.length, sent, failed, sessionsCreated, results };
  }
}
