import type { Env, BroadcastJob, BroadcastResult, Game, GameTemplate, ClickableArea } from '../types';
import { OutboundService } from './outbound';
import { GroupService } from './group';
import { ChannelService } from './channel';

function generateId(): string {
  return crypto.randomUUID();
}

export interface CreateBroadcastJobInput {
  gameId: string;
  targetType: 'all' | 'channel' | 'group' | 'custom';
  targetId?: string;
  customKeys?: string[];
  customMessage?: string;
  batchSize?: number;
}

export interface BroadcastJobWithProgress extends BroadcastJob {
  progress: number;
  game?: { id: string; name: string };
}

export class BroadcastService {
  private outbound: OutboundService;
  private groupService: GroupService;
  private channelService: ChannelService;

  constructor(private db: D1Database, private env: Env) {
    this.outbound = new OutboundService(env);
    this.groupService = new GroupService(db);
    this.channelService = new ChannelService(db);
  }

  // ============ Job Management ============

  async createJob(input: CreateBroadcastJobInput): Promise<BroadcastJob> {
    // Validate game exists
    const game = await this.db
      .prepare('SELECT id, name FROM games WHERE id = ?')
      .bind(input.gameId)
      .first<{ id: string; name: string }>();

    if (!game) {
      throw new Error('Game not found');
    }

    // Get recipient count based on target type
    let totalRecipients = 0;
    let customKeysJson: string | null = null;

    switch (input.targetType) {
      case 'all': {
        const result = await this.db
          .prepare('SELECT COUNT(*) as count FROM players WHERE custom_key IS NOT NULL')
          .first<{ count: number }>();
        totalRecipients = result?.count || 0;
        break;
      }
      case 'channel': {
        if (!input.targetId) throw new Error('targetId is required for channel broadcast');
        const customKeys = await this.channelService.getChannelPlayerCustomKeys(input.targetId);
        totalRecipients = customKeys.length;
        break;
      }
      case 'group': {
        if (!input.targetId) throw new Error('targetId is required for group broadcast');
        const customKeys = await this.groupService.getGroupMemberCustomKeys(input.targetId);
        totalRecipients = customKeys.length;
        break;
      }
      case 'custom': {
        if (!input.customKeys || input.customKeys.length === 0) {
          throw new Error('customKeys is required for custom broadcast');
        }
        totalRecipients = input.customKeys.length;
        customKeysJson = JSON.stringify(input.customKeys);
        break;
      }
    }

    if (totalRecipients === 0) {
      throw new Error('No recipients found for this broadcast');
    }

    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO broadcast_jobs 
         (id, game_id, target_type, target_id, custom_keys, custom_message, status, total_recipients, batch_size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`
      )
      .bind(
        id,
        input.gameId,
        input.targetType,
        input.targetId || null,
        customKeysJson,
        input.customMessage || null,
        totalRecipients,
        input.batchSize || 50,
        now
      )
      .run();

    return (await this.findJobById(id))!;
  }

  async findJobById(id: string): Promise<BroadcastJobWithProgress | null> {
    const job = await this.db
      .prepare(
        `SELECT j.*, g.name as game_name
         FROM broadcast_jobs j
         LEFT JOIN games g ON j.game_id = g.id
         WHERE j.id = ?`
      )
      .bind(id)
      .first<BroadcastJob & { game_name: string }>();

    if (!job) return null;

    return {
      ...job,
      progress: job.total_recipients > 0 ? (job.processed / job.total_recipients) * 100 : 0,
      game: { id: job.game_id, name: job.game_name },
    };
  }

  async findAllJobs(filters?: {
    status?: string;
    gameId?: string;
    limit?: number;
  }): Promise<BroadcastJobWithProgress[]> {
    let query = `
      SELECT j.*, g.name as game_name
      FROM broadcast_jobs j
      LEFT JOIN games g ON j.game_id = g.id
      WHERE 1=1
    `;
    const values: unknown[] = [];

    if (filters?.status) {
      query += ' AND j.status = ?';
      values.push(filters.status);
    }
    if (filters?.gameId) {
      query += ' AND j.game_id = ?';
      values.push(filters.gameId);
    }

    query += ' ORDER BY j.created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      values.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const result = await (values.length > 0 ? stmt.bind(...values) : stmt).all<BroadcastJob & { game_name: string }>();

    return result.results.map((job) => ({
      ...job,
      progress: job.total_recipients > 0 ? (job.processed / job.total_recipients) * 100 : 0,
      game: { id: job.game_id, name: job.game_name },
    }));
  }

  async cancelJob(id: string): Promise<boolean> {
    const job = await this.findJobById(id);
    if (!job) return false;

    if (job.status !== 'PENDING' && job.status !== 'PROCESSING') {
      throw new Error('Cannot cancel job that is not pending or processing');
    }

    await this.db
      .prepare("UPDATE broadcast_jobs SET status = 'CANCELLED', completed_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();

    return true;
  }

  // ============ Job Processing ============

  /**
   * Process a batch of recipients for a job
   * Returns true if there are more batches to process
   */
  async processJobBatch(jobId: string): Promise<{
    hasMore: boolean;
    processed: number;
    sent: number;
    failed: number;
  }> {
    const job = await this.findJobById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'CANCELLED' || job.status === 'COMPLETED' || job.status === 'FAILED') {
      return { hasMore: false, processed: 0, sent: 0, failed: 0 };
    }

    // Mark as processing if pending
    if (job.status === 'PENDING') {
      await this.db
        .prepare("UPDATE broadcast_jobs SET status = 'PROCESSING', started_at = datetime('now') WHERE id = ?")
        .bind(jobId)
        .run();
    }

    // Get recipients for this batch
    const customKeys = await this.getRecipientsForBatch(job);

    if (customKeys.length === 0) {
      // No more recipients, mark as completed
      await this.db
        .prepare("UPDATE broadcast_jobs SET status = 'COMPLETED', completed_at = datetime('now') WHERE id = ?")
        .bind(jobId)
        .run();
      return { hasMore: false, processed: 0, sent: 0, failed: 0 };
    }

    // Get game with template
    const game = await this.db
      .prepare(
        `SELECT g.*, t.clickable_areas, t.type as template_type
         FROM games g
         JOIN game_templates t ON g.template_id = t.id
         WHERE g.id = ?`
      )
      .bind(job.game_id)
      .first<Game & { clickable_areas: string; template_type: string }>();

    if (!game) {
      await this.db
        .prepare("UPDATE broadcast_jobs SET status = 'FAILED', error_message = 'Game not found', completed_at = datetime('now') WHERE id = ?")
        .bind(jobId)
        .run();
      throw new Error('Game not found');
    }

    // Build flex content
    let clickableAreas: ClickableArea[] = JSON.parse(game.clickable_areas);
    if (game.template_type === 'tap_zone' && game.custom_zone) {
      const customZone = JSON.parse(game.custom_zone);
      clickableAreas = [{ position: 1, ...customZone }];
    }

    const flexContent = this.outbound.createGameFlexWithOverlay(
      game.image_url,
      game.image_width,
      game.image_height,
      clickableAreas,
      game.id
    );

    const altText = job.custom_message || `เกม ${game.name}`;

    // Build send options with group_id based on target type
    const sendOptions: { groupId?: string; channelId?: string } = {};
    if (job.target_type === 'group' && job.target_id) {
      sendOptions.groupId = job.target_id;
    } else if (job.target_type === 'channel' && job.target_id) {
      sendOptions.channelId = job.target_id;
    }

    // Send to each recipient in batch
    let batchSent = 0;
    let batchFailed = 0;

    for (const customKey of customKeys) {
      try {
        const result = await this.outbound.sendFlex(customKey, flexContent, altText, sendOptions);

        // Store result
        await this.db
          .prepare(
            `INSERT INTO broadcast_results (id, job_id, custom_key, success, error_message, sent_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            generateId(),
            jobId,
            customKey,
            result.success ? 1 : 0,
            result.success ? null : (result.error?.message || 'Unknown error')
          )
          .run();

        if (result.success) {
          batchSent++;
        } else {
          batchFailed++;
        }
      } catch (error) {
        batchFailed++;
        await this.db
          .prepare(
            `INSERT INTO broadcast_results (id, job_id, custom_key, success, error_message, sent_at)
             VALUES (?, ?, ?, 0, ?, datetime('now'))`
          )
          .bind(generateId(), jobId, customKey, error instanceof Error ? error.message : 'Unknown error')
          .run();
      }
    }

    const batchProcessed = batchSent + batchFailed;
    const newOffset = job.current_offset + batchProcessed;
    const newProcessed = job.processed + batchProcessed;
    const newSent = job.sent + batchSent;
    const newFailed = job.failed + batchFailed;
    const hasMore = newProcessed < job.total_recipients;

    // Update job progress
    await this.db
      .prepare(
        `UPDATE broadcast_jobs 
         SET current_offset = ?, processed = ?, sent = ?, failed = ?,
             status = ?, completed_at = ?
         WHERE id = ?`
      )
      .bind(
        newOffset,
        newProcessed,
        newSent,
        newFailed,
        hasMore ? 'PROCESSING' : 'COMPLETED',
        hasMore ? null : new Date().toISOString(),
        jobId
      )
      .run();

    return {
      hasMore,
      processed: batchProcessed,
      sent: batchSent,
      failed: batchFailed,
    };
  }

  private async getRecipientsForBatch(job: BroadcastJob): Promise<string[]> {
    const offset = job.current_offset;
    const limit = job.batch_size;

    switch (job.target_type) {
      case 'all': {
        const result = await this.db
          .prepare(
            `SELECT custom_key FROM players 
             WHERE custom_key IS NOT NULL 
             ORDER BY created_at 
             LIMIT ? OFFSET ?`
          )
          .bind(limit, offset)
          .all<{ custom_key: string }>();
        return result.results.map((r) => r.custom_key);
      }
      case 'channel': {
        const allKeys = await this.channelService.getChannelPlayerCustomKeys(job.target_id!);
        return allKeys.slice(offset, offset + limit);
      }
      case 'group': {
        const allKeys = await this.groupService.getGroupMemberCustomKeys(job.target_id!);
        return allKeys.slice(offset, offset + limit);
      }
      case 'custom': {
        const allKeys = JSON.parse(job.custom_keys!) as string[];
        return allKeys.slice(offset, offset + limit);
      }
      default:
        return [];
    }
  }

  /**
   * Process all remaining batches for a job (blocking)
   * Useful for small broadcasts or testing
   */
  async processJobFully(jobId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
  }> {
    let totalSent = 0;
    let totalFailed = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.processJobBatch(jobId);
      totalSent += result.sent;
      totalFailed += result.failed;
      hasMore = result.hasMore;
    }

    const job = await this.findJobById(jobId);
    return {
      total: job?.total_recipients || 0,
      sent: totalSent,
      failed: totalFailed,
    };
  }

  // ============ Job Results ============

  async getJobResults(
    jobId: string,
    filters?: { success?: boolean; limit?: number; offset?: number }
  ): Promise<{ results: BroadcastResult[]; total: number }> {
    let countQuery = 'SELECT COUNT(*) as count FROM broadcast_results WHERE job_id = ?';
    let query = 'SELECT * FROM broadcast_results WHERE job_id = ?';
    const values: unknown[] = [jobId];

    if (filters?.success !== undefined) {
      countQuery += ' AND success = ?';
      query += ' AND success = ?';
      values.push(filters.success ? 1 : 0);
    }

    query += ' ORDER BY sent_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      values.push(filters.limit);
    }
    if (filters?.offset) {
      query += ' OFFSET ?';
      values.push(filters.offset);
    }

    const [countResult, dataResult] = await Promise.all([
      this.db
        .prepare(countQuery)
        .bind(...values.slice(0, filters?.success !== undefined ? 2 : 1))
        .first<{ count: number }>(),
      this.db.prepare(query).bind(...values).all<BroadcastResult>(),
    ]);

    return {
      results: dataResult.results,
      total: countResult?.count || 0,
    };
  }

  // ============ Pending Jobs Processing ============

  /**
   * Get pending or processing jobs that need work
   */
  async getPendingJobs(limit: number = 5): Promise<BroadcastJob[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM broadcast_jobs 
         WHERE status IN ('PENDING', 'PROCESSING') 
         ORDER BY created_at ASC 
         LIMIT ?`
      )
      .bind(limit)
      .all<BroadcastJob>();

    return result.results;
  }

  /**
   * Process one batch for each pending job
   * Call this from a scheduled worker
   */
  async processPendingJobs(): Promise<{
    jobsProcessed: number;
    totalSent: number;
    totalFailed: number;
  }> {
    const pendingJobs = await this.getPendingJobs();

    let totalSent = 0;
    let totalFailed = 0;

    for (const job of pendingJobs) {
      try {
        const result = await this.processJobBatch(job.id);
        totalSent += result.sent;
        totalFailed += result.failed;
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
      }
    }

    return {
      jobsProcessed: pendingJobs.length,
      totalSent,
      totalFailed,
    };
  }
}
