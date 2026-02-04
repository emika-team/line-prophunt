import { Hono } from 'hono';
import type { Env } from '../types';
import { GameService } from '../services/game';

const admin = new Hono<{ Bindings: Env }>();

// Helper to get GameService
function getGameService(c: { env: Env }) {
  return new GameService(c.env.DB, c.env);
}

// ============ Dashboard ============

admin.get('/dashboard', async (c) => {
  const groupId = c.req.query('groupId');
  const gameService = getGameService(c);
  const gameStats = await gameService.getDashboardStats(groupId);
  return c.json({ game: gameStats });
});

// ============ Templates CRUD ============

admin.get('/templates', async (c) => {
  const gameService = getGameService(c);
  const templates = await gameService.findAllTemplates();
  
  // Transform to frontend format
  return c.json(templates.map(t => ({
    _id: t.id,
    name: t.name,
    description: t.description,
    type: t.type,
    header: JSON.parse(t.header),
    content: JSON.parse(t.content),
    clickableAreas: JSON.parse(t.clickable_areas),
    totalZones: t.total_zones,
    singleAttempt: t.single_attempt === 1,
    templateImageUrl: t.template_image_url,
    isActive: t.is_active === 1,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  })));
});

admin.get('/templates/:id', async (c) => {
  const gameService = getGameService(c);
  const template = await gameService.findTemplateById(c.req.param('id'));
  
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.json({
    _id: template.id,
    name: template.name,
    description: template.description,
    type: template.type,
    header: JSON.parse(template.header),
    content: JSON.parse(template.content),
    clickableAreas: JSON.parse(template.clickable_areas),
    totalZones: template.total_zones,
    singleAttempt: template.single_attempt === 1,
    templateImageUrl: template.template_image_url,
    isActive: template.is_active === 1,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  });
});

admin.post('/templates', async (c) => {
  const body = await c.req.json();
  const gameService = getGameService(c);
  
  const template = await gameService.createTemplate({
    name: body.name,
    description: body.description,
    type: body.type,
    header: body.header,
    content: body.content,
    clickableAreas: body.clickableAreas,
    totalZones: body.totalZones,
    singleAttempt: body.singleAttempt,
    templateImageUrl: body.templateImageUrl,
  });

  return c.json({
    _id: template.id,
    name: template.name,
    description: template.description,
    type: template.type,
    header: JSON.parse(template.header),
    content: JSON.parse(template.content),
    clickableAreas: JSON.parse(template.clickable_areas),
    totalZones: template.total_zones,
    singleAttempt: template.single_attempt === 1,
    templateImageUrl: template.template_image_url,
    isActive: template.is_active === 1,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  }, 201);
});

admin.put('/templates/:id', async (c) => {
  const body = await c.req.json();
  const gameService = getGameService(c);
  
  const template = await gameService.updateTemplate(c.req.param('id'), body);
  
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.json({
    _id: template.id,
    name: template.name,
    description: template.description,
    type: template.type,
    header: JSON.parse(template.header),
    content: JSON.parse(template.content),
    clickableAreas: JSON.parse(template.clickable_areas),
    totalZones: template.total_zones,
    singleAttempt: template.single_attempt === 1,
    templateImageUrl: template.template_image_url,
    isActive: template.is_active === 1,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  });
});

admin.delete('/templates/:id', async (c) => {
  const gameService = getGameService(c);
  const deleted = await gameService.deleteTemplate(c.req.param('id'));
  
  if (!deleted) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.body(null, 204);
});

// ============ Games CRUD ============

admin.get('/games', async (c) => {
  const gameService = getGameService(c);
  const games = await gameService.findAllGames();
  
  return c.json(games.map(g => ({
    _id: g.id,
    name: g.name,
    templateId: g.template ? {
      _id: g.template.id,
      name: g.template.name,
      type: g.template.type,
      totalZones: g.template.total_zones,
      clickableAreas: JSON.parse(g.template.clickable_areas),
    } : g.template_id,
    imageUrl: g.image_url,
    imageWidth: g.image_width,
    imageHeight: g.image_height,
    correctPosition: g.correct_position,
    customZone: g.custom_zone ? JSON.parse(g.custom_zone) : null,
    winCallbackUrl: g.win_callback_url,
    isActive: g.is_active === 1,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  })));
});

admin.get('/games/:id', async (c) => {
  const gameService = getGameService(c);
  const game = await gameService.findGameById(c.req.param('id'));
  
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }

  return c.json({
    _id: game.id,
    name: game.name,
    templateId: game.template ? {
      _id: game.template.id,
      name: game.template.name,
      type: game.template.type,
      totalZones: game.template.total_zones,
      clickableAreas: JSON.parse(game.template.clickable_areas),
    } : game.template_id,
    imageUrl: game.image_url,
    imageWidth: game.image_width,
    imageHeight: game.image_height,
    correctPosition: game.correct_position,
    customZone: game.custom_zone ? JSON.parse(game.custom_zone) : null,
    winCallbackUrl: game.win_callback_url,
    isActive: game.is_active === 1,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  });
});

admin.post('/games', async (c) => {
  const body = await c.req.json();
  const gameService = getGameService(c);
  
  try {
    const game = await gameService.createGame({
      name: body.name,
      templateId: body.templateId,
      imageUrl: body.imageUrl,
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
      correctPosition: body.correctPosition,
      customZone: body.customZone,
      winCallbackUrl: body.winCallbackUrl,
    });

    return c.json({
      _id: game.id,
      name: game.name,
      templateId: game.template_id,
      imageUrl: game.image_url,
      imageWidth: game.image_width,
      imageHeight: game.image_height,
      correctPosition: game.correct_position,
      customZone: game.custom_zone ? JSON.parse(game.custom_zone) : null,
      winCallbackUrl: game.win_callback_url,
      isActive: game.is_active === 1,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Template not found') {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 400);
  }
});

admin.put('/games/:id', async (c) => {
  const body = await c.req.json();
  const gameService = getGameService(c);
  
  const game = await gameService.updateGame(c.req.param('id'), body);
  
  if (!game) {
    return c.json({ error: 'Game not found' }, 404);
  }

  return c.json({
    _id: game.id,
    name: game.name,
    templateId: game.template_id,
    imageUrl: game.image_url,
    imageWidth: game.image_width,
    imageHeight: game.image_height,
    correctPosition: game.correct_position,
    customZone: game.custom_zone ? JSON.parse(game.custom_zone) : null,
    winCallbackUrl: game.win_callback_url,
    isActive: game.is_active === 1,
    createdAt: game.created_at,
    updatedAt: game.updated_at,
  });
});

admin.delete('/games/:id', async (c) => {
  const gameService = getGameService(c);
  const deleted = await gameService.deleteGame(c.req.param('id'));
  
  if (!deleted) {
    return c.json({ error: 'Game not found' }, 404);
  }

  return c.body(null, 204);
});

// ============ Broadcast ============

admin.post('/games/:id/broadcast', async (c) => {
  const body = await c.req.json<{ customKeys: string[]; customMessage?: string; groupId?: string }>();
  const gameService = getGameService(c);
  
  try {
    const result = await gameService.broadcastGame(
      c.req.param('id'),
      body.customKeys,
      body.customMessage,
      body.groupId
    );
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Game not found') {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 400);
  }
});

// ============ Sessions ============

admin.get('/sessions', async (c) => {
  const winnersOnly = c.req.query('winnersOnly');
  const rewardStatus = c.req.query('rewardStatus');
  const groupId = c.req.query('groupId');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '10', 10);

  const filters: { isCorrect?: boolean; rewardStatus?: string; groupId?: string } = {};
  if (winnersOnly === 'true') filters.isCorrect = true;
  if (rewardStatus) filters.rewardStatus = rewardStatus;
  if (groupId) filters.groupId = groupId;

  const gameService = getGameService(c);
  const sessions = await gameService.findAllSessions(filters);

  // Transform to expected format
  const transformedSessions = sessions.map((session) => ({
    _id: session.id,
    player: session.player ? {
      _id: session.player.id,
      customerId: session.player.customer_id,
      customKey: session.player.custom_key,
      displayName: session.player.display_name,
      groupId: session.player.group_id,
      state: session.player.state,
    } : null,
    game: session.game ? {
      _id: session.game.id,
      name: session.game.name,
      imageUrl: session.game.image_url,
    } : null,
    answer: session.answer,
    isCorrect: session.is_correct === 1,
    rewardStatus: session.reward_status?.toLowerCase() || null,
    answeredAt: session.answered_at,
    createdAt: session.created_at,
  }));

  const total = transformedSessions.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = transformedSessions.slice(startIndex, startIndex + limit);

  return c.json({
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
  });
});

admin.put('/sessions/:id', async (c) => {
  const body = await c.req.json<{ rewardStatus: 'PENDING' | 'PAID' }>();
  const gameService = getGameService(c);
  
  const session = await gameService.updateSessionRewardStatus(c.req.param('id'), body.rewardStatus);
  
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({
    _id: session.id,
    playerId: session.player_id,
    gameId: session.game_id,
    answer: session.answer,
    isCorrect: session.is_correct === 1,
    rewardStatus: session.reward_status?.toLowerCase() || null,
    answeredAt: session.answered_at,
    createdAt: session.created_at,
  });
});

// ============ Players ============

admin.get('/players', async (c) => {
  const groupId = c.req.query('groupId');
  const gameService = getGameService(c);
  const players = await gameService.findAllPlayers(groupId);

  return c.json(players.map(p => ({
    _id: p.id,
    customerId: p.customer_id,
    customKey: p.custom_key,
    displayName: p.display_name,
    groupId: p.group_id,
    state: p.state,
    currentGameId: p.current_game_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  })));
});

export default admin;
