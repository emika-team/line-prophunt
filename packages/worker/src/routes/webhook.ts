import { Hono } from 'hono';
import type { Env, WebhookPayload } from '../types';
import { GameService } from '../services/game';

const webhook = new Hono<{ Bindings: Env }>();

// POST /api/webhook - Receive postback from chatapi
webhook.post('/', async (c) => {
  const payload = await c.req.json<WebhookPayload>();

  console.log(`Webhook received: event=${payload.event}`);

  // Handle postback event
  if (payload.event === 'postback' && payload.data) {
    const params = new URLSearchParams(payload.data);
    const action = params.get('action');
    const position = params.get('position');
    const gameId = params.get('gameId');

    console.log(`Postback: action=${action}, position=${position}, gameId=${gameId}`);

    if (action === 'answer' && position && gameId) {
      const customKey = payload.key_value;

      if (!customKey) {
        console.warn('No customKey in postback payload');
        return c.json({ status: 'ok', handled: false });
      }

      const gameService = new GameService(c.env.DB, c.env);
      await gameService.handlePostbackAnswer(customKey, parseInt(position, 10), gameId);

      return c.json({ status: 'ok' });
    }
  }

  return c.json({ status: 'ok', handled: false });
});

export default webhook;
