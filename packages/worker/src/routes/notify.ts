import { Hono } from 'hono';
import type { Env } from '../types';
import { OutboundService } from '../services/outbound';
import { MessageTemplateService } from '../services/message-template';

const notify = new Hono<{ Bindings: Env }>();

// POST /api/notify/deposit - ส่งใบเสร็จฝากเงิน
notify.post('/deposit', async (c) => {
  const body = await c.req.json<{
    username: string;
    amount: string | number;
    date?: string;
    txId?: string;
  }>();

  if (!body.username || !body.amount) {
    return c.json({ error: 'username and amount are required' }, 400);
  }

  const templateService = new MessageTemplateService(c.env.DB, c.env);
  const outbound = new OutboundService(c.env);

  // Find deposit template
  const templates = await templateService.findAll('receipt');
  const template = templates.find(t => t.name === 'ใบเสร็จฝากเงิน');

  if (!template) {
    return c.json({ error: 'Deposit template not found' }, 500);
  }

  const variables = {
    username: body.username,
    amount: String(body.amount),
    date: body.date || new Date().toLocaleString('th-TH'),
    txId: body.txId || '-',
  };

  const content = templateService.renderTemplate(template, variables);
  const result = await outbound.sendFlex(body.username, content, 'ฝากเงินสำเร็จ');

  if (!result.success) {
    return c.json({ success: false, error: result.error?.message }, 500);
  }

  return c.json({ success: true });
});

// POST /api/notify/withdraw - ส่งใบเสร็จถอนเงิน
notify.post('/withdraw', async (c) => {
  const body = await c.req.json<{
    username: string;
    amount: string | number;
    date?: string;
    txId?: string;
  }>();

  if (!body.username || !body.amount) {
    return c.json({ error: 'username and amount are required' }, 400);
  }

  const templateService = new MessageTemplateService(c.env.DB, c.env);
  const outbound = new OutboundService(c.env);

  // Find withdraw template
  const templates = await templateService.findAll('receipt');
  const template = templates.find(t => t.name === 'ใบเสร็จถอนเงิน');

  if (!template) {
    return c.json({ error: 'Withdraw template not found' }, 500);
  }

  const variables = {
    username: body.username,
    amount: String(body.amount),
    date: body.date || new Date().toLocaleString('th-TH'),
    txId: body.txId || '-',
  };

  const content = templateService.renderTemplate(template, variables);
  const result = await outbound.sendFlex(body.username, content, 'ถอนเงินสำเร็จ');

  if (!result.success) {
    return c.json({ success: false, error: result.error?.message }, 500);
  }

  return c.json({ success: true });
});

// POST /api/notify/reward/win - แจ้งได้รับรางวัล
notify.post('/reward/win', async (c) => {
  const body = await c.req.json<{
    username: string;
    reward: string;
    message?: string;
    buttonText?: string;
    buttonUrl?: string;
  }>();

  if (!body.username || !body.reward) {
    return c.json({ error: 'username and reward are required' }, 400);
  }

  const templateService = new MessageTemplateService(c.env.DB, c.env);
  const outbound = new OutboundService(c.env);

  const templates = await templateService.findAll('reward');
  const template = templates.find(t => t.name === 'แจ้งรางวัล - ชนะ');

  if (!template) {
    return c.json({ error: 'Win reward template not found' }, 500);
  }

  const variables = {
    username: body.username,
    reward: body.reward,
    message: body.message || 'ขอบคุณที่ร่วมกิจกรรม',
    buttonText: body.buttonText || '',
    buttonUrl: body.buttonUrl || '',
  };

  const content = templateService.renderTemplate(template, variables);
  const result = await outbound.sendFlex(body.username, content, 'ยินดีด้วย! คุณได้รับรางวัล');

  if (!result.success) {
    return c.json({ success: false, error: result.error?.message }, 500);
  }

  return c.json({ success: true });
});

// POST /api/notify/reward/lose - แจ้งไม่ได้รับรางวัล
notify.post('/reward/lose', async (c) => {
  const body = await c.req.json<{
    username: string;
    message?: string;
    buttonText?: string;
    buttonUrl?: string;
  }>();

  if (!body.username) {
    return c.json({ error: 'username is required' }, 400);
  }

  const templateService = new MessageTemplateService(c.env.DB, c.env);
  const outbound = new OutboundService(c.env);

  const templates = await templateService.findAll('reward');
  const template = templates.find(t => t.name === 'แจ้งรางวัล - ไม่ชนะ');

  if (!template) {
    return c.json({ error: 'Lose reward template not found' }, 500);
  }

  const variables = {
    message: body.message || 'ขอบคุณที่ร่วมกิจกรรม',
    buttonText: body.buttonText || '',
    buttonUrl: body.buttonUrl || '',
  };

  const content = templateService.renderTemplate(template, variables);
  const result = await outbound.sendFlex(body.username, content, 'เสียใจด้วย');

  if (!result.success) {
    return c.json({ success: false, error: result.error?.message }, 500);
  }

  return c.json({ success: true });
});

// POST /api/notify/promotion - ส่งโปรโมชั่น
notify.post('/promotion', async (c) => {
  const body = await c.req.json<{
    username: string;
    title: string;
    description: string;
    imageUrl: string;
    buttonText: string;
    buttonUrl: string;
  }>();

  if (!body.username || !body.title || !body.imageUrl || !body.buttonUrl) {
    return c.json({ error: 'username, title, imageUrl, and buttonUrl are required' }, 400);
  }

  const templateService = new MessageTemplateService(c.env.DB, c.env);
  const outbound = new OutboundService(c.env);

  const templates = await templateService.findAll('promotion');
  const template = templates.find(t => t.name === 'ข้อความโปรโมชั่น');

  if (!template) {
    return c.json({ error: 'Promotion template not found' }, 500);
  }

  const variables = {
    title: body.title,
    description: body.description || '',
    imageUrl: body.imageUrl,
    buttonText: body.buttonText || 'ดูรายละเอียด',
    buttonUrl: body.buttonUrl,
  };

  const content = templateService.renderTemplate(template, variables);
  const result = await outbound.sendFlex(body.username, content, body.title);

  if (!result.success) {
    return c.json({ success: false, error: result.error?.message }, 500);
  }

  return c.json({ success: true });
});

export default notify;
