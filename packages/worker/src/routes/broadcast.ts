import { Hono } from 'hono';
import type { Env } from '../types';
import { GroupService } from '../services/group';
import { ChannelService } from '../services/channel';
import { BroadcastService } from '../services/broadcast';

const broadcast = new Hono<{ Bindings: Env }>();

// ============ Channels ============

broadcast.get('/channels', async (c) => {
  const channelService = new ChannelService(c.env.DB);
  const channels = await channelService.findAllChannels();

  return c.json(
    channels.map((ch) => ({
      _id: ch.id,
      channelId: ch.channel_id,
      channelName: ch.channel_name,
      isActive: ch.is_active === 1,
      playerCount: ch.playerCount,
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
    }))
  );
});

broadcast.get('/channels/:id', async (c) => {
  const channelService = new ChannelService(c.env.DB);
  const channel = await channelService.findChannelById(c.req.param('id'));

  if (!channel) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  return c.json({
    _id: channel.id,
    channelId: channel.channel_id,
    channelName: channel.channel_name,
    isActive: channel.is_active === 1,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  });
});

broadcast.post('/channels', async (c) => {
  const body = await c.req.json<{
    channelId: string;
    channelName: string;
    channelSecret?: string;
    accessToken?: string;
  }>();

  const channelService = new ChannelService(c.env.DB);

  try {
    const channel = await channelService.createChannel(body);

    return c.json(
      {
        _id: channel.id,
        channelId: channel.channel_id,
        channelName: channel.channel_name,
        isActive: channel.is_active === 1,
        createdAt: channel.created_at,
        updatedAt: channel.updated_at,
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

broadcast.put('/channels/:id', async (c) => {
  const body = await c.req.json();
  const channelService = new ChannelService(c.env.DB);

  const channel = await channelService.updateChannel(c.req.param('id'), body);

  if (!channel) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  return c.json({
    _id: channel.id,
    channelId: channel.channel_id,
    channelName: channel.channel_name,
    isActive: channel.is_active === 1,
    createdAt: channel.created_at,
    updatedAt: channel.updated_at,
  });
});

broadcast.delete('/channels/:id', async (c) => {
  const channelService = new ChannelService(c.env.DB);
  const deleted = await channelService.deleteChannel(c.req.param('id'));

  if (!deleted) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  return c.body(null, 204);
});

// ============ Groups ============

broadcast.get('/groups', async (c) => {
  const channelId = c.req.query('channelId');
  const groupService = new GroupService(c.env.DB);
  const groups = await groupService.findAllGroups(channelId);

  return c.json(
    groups.map((g) => ({
      _id: g.id,
      name: g.name,
      description: g.description,
      channelId: g.channel_id,
      isActive: g.is_active === 1,
      memberCount: g.memberCount,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }))
  );
});

broadcast.get('/groups/:id', async (c) => {
  const groupService = new GroupService(c.env.DB);
  const group = await groupService.findGroupById(c.req.param('id'));

  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  return c.json({
    _id: group.id,
    name: group.name,
    description: group.description,
    channelId: group.channel_id,
    isActive: group.is_active === 1,
    memberCount: group.memberCount,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  });
});

broadcast.post('/groups', async (c) => {
  const body = await c.req.json<{
    name: string;
    description?: string;
    channelId?: string;
  }>();

  const groupService = new GroupService(c.env.DB);

  try {
    const group = await groupService.createGroup(body) as typeof body & { id: string; is_active: number; channel_id: string | null; created_at: string; updated_at: string };

    return c.json(
      {
        _id: group.id,
        name: group.name,
        description: group.description,
        channelId: group.channel_id,
        isActive: group.is_active === 1,
        memberCount: 0,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

broadcast.put('/groups/:id', async (c) => {
  const body = await c.req.json();
  const groupService = new GroupService(c.env.DB);

  const group = await groupService.updateGroup(c.req.param('id'), body);

  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  return c.json({
    _id: group.id,
    name: group.name,
    description: group.description,
    channelId: group.channel_id,
    isActive: group.is_active === 1,
    memberCount: group.memberCount,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  });
});

broadcast.delete('/groups/:id', async (c) => {
  const groupService = new GroupService(c.env.DB);
  const deleted = await groupService.deleteGroup(c.req.param('id'));

  if (!deleted) {
    return c.json({ error: 'Group not found' }, 404);
  }

  return c.body(null, 204);
});

// ============ Group Members ============

broadcast.get('/groups/:id/members', async (c) => {
  const groupService = new GroupService(c.env.DB);
  const members = await groupService.getGroupMembers(c.req.param('id'));

  return c.json(
    members.map((m) => ({
      _id: m.id,
      customerId: m.customer_id,
      customKey: m.custom_key,
      displayName: m.display_name,
      groupId: m.group_id,
      state: m.state,
      createdAt: m.created_at,
    }))
  );
});

broadcast.post('/groups/:id/members', async (c) => {
  const body = await c.req.json<{
    playerIds?: string[];
    customKeys?: string[];
  }>();

  const groupService = new GroupService(c.env.DB);
  const groupId = c.req.param('id');

  if (body.playerIds && body.playerIds.length > 0) {
    const result = await groupService.addMembersInBulk(groupId, body.playerIds);
    return c.json(result, 201);
  }

  if (body.customKeys && body.customKeys.length > 0) {
    const result = await groupService.addMembersByCustomKeys(groupId, body.customKeys);
    return c.json(result, 201);
  }

  return c.json({ error: 'Either playerIds or customKeys is required' }, 400);
});

broadcast.delete('/groups/:id/members', async (c) => {
  const body = await c.req.json<{
    playerId?: string;
    customKey?: string;
    clearAll?: boolean;
  }>();

  const groupService = new GroupService(c.env.DB);
  const groupId = c.req.param('id');

  if (body.clearAll) {
    const removed = await groupService.clearGroupMembers(groupId);
    return c.json({ removed });
  }

  if (body.playerId) {
    const success = await groupService.removeMember(groupId, body.playerId);
    return c.json({ success });
  }

  if (body.customKey) {
    const success = await groupService.removeMemberByCustomKey(groupId, body.customKey);
    return c.json({ success });
  }

  return c.json({ error: 'Either playerId, customKey, or clearAll is required' }, 400);
});

// ============ Broadcast Jobs ============

broadcast.get('/jobs', async (c) => {
  const status = c.req.query('status');
  const gameId = c.req.query('gameId');
  const limit = parseInt(c.req.query('limit') || '20', 10);

  const broadcastService = new BroadcastService(c.env.DB, c.env);
  const jobs = await broadcastService.findAllJobs({ status, gameId, limit });

  return c.json(
    jobs.map((j) => ({
      _id: j.id,
      gameId: j.game_id,
      game: j.game,
      targetType: j.target_type,
      targetId: j.target_id,
      customMessage: j.custom_message,
      status: j.status,
      totalRecipients: j.total_recipients,
      processed: j.processed,
      sent: j.sent,
      failed: j.failed,
      progress: j.progress,
      batchSize: j.batch_size,
      errorMessage: j.error_message,
      createdAt: j.created_at,
      startedAt: j.started_at,
      completedAt: j.completed_at,
    }))
  );
});

broadcast.get('/jobs/:id', async (c) => {
  const broadcastService = new BroadcastService(c.env.DB, c.env);
  const job = await broadcastService.findJobById(c.req.param('id'));

  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }

  return c.json({
    _id: job.id,
    gameId: job.game_id,
    game: job.game,
    targetType: job.target_type,
    targetId: job.target_id,
    customMessage: job.custom_message,
    status: job.status,
    totalRecipients: job.total_recipients,
    processed: job.processed,
    sent: job.sent,
    failed: job.failed,
    progress: job.progress,
    batchSize: job.batch_size,
    errorMessage: job.error_message,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
  });
});

broadcast.post('/jobs', async (c) => {
  const body = await c.req.json<{
    gameId: string;
    targetType: 'all' | 'channel' | 'group' | 'custom';
    targetId?: string;
    customKeys?: string[];
    customMessage?: string;
    batchSize?: number;
    processImmediately?: boolean;
  }>();

  const broadcastService = new BroadcastService(c.env.DB, c.env);

  try {
    const job = await broadcastService.createJob({
      gameId: body.gameId,
      targetType: body.targetType,
      targetId: body.targetId,
      customKeys: body.customKeys,
      customMessage: body.customMessage,
      batchSize: body.batchSize,
    });

    // Optionally process immediately (for small broadcasts)
    if (body.processImmediately) {
      const result = await broadcastService.processJobFully(job.id);
      const updatedJob = await broadcastService.findJobById(job.id);

      return c.json(
        {
          _id: updatedJob!.id,
          gameId: updatedJob!.game_id,
          game: updatedJob!.game,
          targetType: updatedJob!.target_type,
          targetId: updatedJob!.target_id,
          status: updatedJob!.status,
          totalRecipients: updatedJob!.total_recipients,
          sent: result.sent,
          failed: result.failed,
          progress: 100,
          completedAt: updatedJob!.completed_at,
        },
        201
      );
    }

    return c.json(
      {
        _id: job.id,
        gameId: job.game_id,
        targetType: job.target_type,
        targetId: job.target_id,
        status: job.status,
        totalRecipients: job.total_recipients,
        message: 'Broadcast job created and will be processed in batches',
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Game not found') {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 400);
  }
});

broadcast.post('/jobs/:id/process', async (c) => {
  const broadcastService = new BroadcastService(c.env.DB, c.env);

  try {
    const result = await broadcastService.processJobBatch(c.req.param('id'));

    return c.json({
      hasMore: result.hasMore,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

broadcast.post('/jobs/:id/cancel', async (c) => {
  const broadcastService = new BroadcastService(c.env.DB, c.env);

  try {
    const success = await broadcastService.cancelJob(c.req.param('id'));

    if (!success) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

broadcast.get('/jobs/:id/results', async (c) => {
  const success = c.req.query('success');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const broadcastService = new BroadcastService(c.env.DB, c.env);

  const { results, total } = await broadcastService.getJobResults(c.req.param('id'), {
    success: success === 'true' ? true : success === 'false' ? false : undefined,
    limit,
    offset,
  });

  return c.json({
    data: results.map((r) => ({
      _id: r.id,
      customKey: r.custom_key,
      success: r.success === 1,
      errorMessage: r.error_message,
      sentAt: r.sent_at,
    })),
    total,
    limit,
    offset,
  });
});

// ============ Quick Broadcast (with channel_id/group_id support) ============

broadcast.post('/quick', async (c) => {
  const body = await c.req.json<{
    gameId: string;
    targetType: 'all' | 'channel' | 'group' | 'custom';
    targetId?: string;
    customKeys?: string[];
    customMessage?: string;
    // Send mode options - passed to outbound API
    channelId?: string;
    groupId?: string;
  }>();

  // For quick broadcast with channelId/groupId, we send directly without job system
  if (body.customKeys && body.customKeys.length > 0 && (body.channelId || body.groupId)) {
    const { OutboundService } = await import('../services/outbound');
    const outbound = new OutboundService(c.env);

    // Get game with template
    const game = await c.env.DB
      .prepare(
        `SELECT g.*, t.clickable_areas, t.type as template_type
         FROM games g
         JOIN game_templates t ON g.template_id = t.id
         WHERE g.id = ?`
      )
      .bind(body.gameId)
      .first<{
        id: string;
        name: string;
        image_url: string;
        image_width: number;
        image_height: number;
        custom_zone: string | null;
        clickable_areas: string;
        template_type: string;
      }>();

    if (!game) {
      return c.json({ error: 'Game not found' }, 404);
    }

    // Build flex content
    let clickableAreas = JSON.parse(game.clickable_areas);
    if (game.template_type === 'tap_zone' && game.custom_zone) {
      const customZone = JSON.parse(game.custom_zone);
      clickableAreas = [{ position: 1, ...customZone }];
    }

    const flexContent = outbound.createGameFlexWithOverlay(
      game.image_url,
      game.image_width,
      game.image_height,
      clickableAreas,
      game.id
    );

    const altText = body.customMessage || `เกม ${game.name}`;
    const sendOptions = {
      channelId: body.channelId,
      groupId: body.groupId,
    };

    let sent = 0;
    let failed = 0;

    for (const customKey of body.customKeys) {
      try {
        const result = await outbound.sendFlex(customKey, flexContent, altText, sendOptions);
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return c.json({
      total: body.customKeys.length,
      sent,
      failed,
    });
  }

  // Fallback to job-based broadcast
  const broadcastService = new BroadcastService(c.env.DB, c.env);

  try {
    const job = await broadcastService.createJob({
      gameId: body.gameId,
      targetType: body.targetType,
      targetId: body.targetId,
      customKeys: body.customKeys,
      customMessage: body.customMessage,
      batchSize: 100,
    });

    const result = await broadcastService.processJobFully(job.id);

    return c.json({
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      jobId: job.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Game not found') {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 400);
  }
});

export default broadcast;
