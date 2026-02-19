import type { Env } from '../types';

export interface MessageTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  content: string; // JSON
  variables: string | null; // JSON array of variable names
  is_active: number;
  created_at: string;
  updated_at: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

// Default Flex Templates
const DEFAULT_TEMPLATES = [
  {
    name: 'ใบเสร็จฝากเงิน',
    description: 'แจ้งยืนยันการฝากเงินสำเร็จ',
    category: 'receipt',
    type: 'flex',
    variables: ['username', 'amount', 'date', 'txId'],
    content: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '✅ ฝากเงินสำเร็จ', weight: 'bold', size: 'xl', color: '#ffffff' }
        ],
        backgroundColor: '#27AE60',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'รายละเอียดการฝากเงิน', weight: 'bold', size: 'md', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box', layout: 'horizontal', margin: 'lg', contents: [
              { type: 'text', text: 'ยูสเซอร์', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{username}}', size: 'sm', color: '#111111', align: 'end' }
            ]
          },
          {
            type: 'box', layout: 'horizontal', margin: 'md', contents: [
              { type: 'text', text: 'จำนวนเงิน', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{amount}} บาท', size: 'sm', color: '#27AE60', align: 'end', weight: 'bold' }
            ]
          },
          {
            type: 'box', layout: 'horizontal', margin: 'md', contents: [
              { type: 'text', text: 'วันที่', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{date}}', size: 'sm', color: '#111111', align: 'end' }
            ]
          },
          {
            type: 'box', layout: 'horizontal', margin: 'md', contents: [
              { type: 'text', text: 'เลขอ้างอิง', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{txId}}', size: 'sm', color: '#111111', align: 'end' }
            ]
          }
        ],
        paddingAll: '20px'
      }
    }
  },
  {
    name: 'ใบเสร็จถอนเงิน',
    description: 'แจ้งยืนยันการถอนเงินสำเร็จ',
    category: 'receipt',
    type: 'flex',
    variables: ['username', 'amount', 'date', 'txId'],
    content: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '💸 ถอนเงินสำเร็จ', weight: 'bold', size: 'xl', color: '#ffffff' }
        ],
        backgroundColor: '#3498DB',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'รายละเอียดการถอนเงิน', weight: 'bold', size: 'md', margin: 'md' },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box', layout: 'horizontal', margin: 'lg', contents: [
              { type: 'text', text: 'ยูสเซอร์', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{username}}', size: 'sm', color: '#111111', align: 'end' }
            ]
          },
          {
            type: 'box', layout: 'horizontal', margin: 'md', contents: [
              { type: 'text', text: 'จำนวนเงิน', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{amount}} บาท', size: 'sm', color: '#3498DB', align: 'end', weight: 'bold' }
            ]
          },
          {
            type: 'box', layout: 'horizontal', margin: 'md', contents: [
              { type: 'text', text: 'วันที่', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{date}}', size: 'sm', color: '#111111', align: 'end' }
            ]
          },
          {
            type: 'box', layout: 'horizontal', margin: 'md', contents: [
              { type: 'text', text: 'เลขอ้างอิง', size: 'sm', color: '#555555', flex: 0 },
              { type: 'text', text: '{{txId}}', size: 'sm', color: '#111111', align: 'end' }
            ]
          }
        ],
        paddingAll: '20px'
      }
    }
  },
  {
    name: 'แจ้งรางวัล - ชนะ',
    description: 'แจ้งผู้เล่นว่าได้รับรางวัล (มีปุ่ม link ถ้ากรอก)',
    category: 'reward',
    type: 'flex',
    variables: ['username', 'reward', 'message', 'buttonText', 'buttonUrl'],
    content: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '🎉', size: '3xl', align: 'center' },
          { type: 'text', text: 'ยินดีด้วย!', weight: 'bold', size: 'xxl', color: '#ffffff', align: 'center', margin: 'md' }
        ],
        backgroundColor: '#F39C12',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'คุณ {{username}}', size: 'lg', weight: 'bold', align: 'center' },
          { type: 'text', text: 'ได้รับรางวัล', size: 'md', align: 'center', margin: 'md', color: '#555555' },
          { type: 'text', text: '{{reward}}', size: 'xl', weight: 'bold', align: 'center', margin: 'lg', color: '#F39C12' },
          { type: 'separator', margin: 'xl' },
          { type: 'text', text: '{{message}}', size: 'sm', align: 'center', margin: 'lg', color: '#888888', wrap: true }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: { type: 'uri', label: '{{buttonText}}', uri: '{{buttonUrl}}' },
            style: 'primary',
            color: '#F39C12'
          }
        ],
        paddingAll: '10px'
      }
    }
  },
  {
    name: 'แจ้งรางวัล - ไม่ชนะ',
    description: 'แจ้งผู้เล่นว่าไม่ได้รับรางวัล (มีปุ่ม link ถ้ากรอก)',
    category: 'reward',
    type: 'flex',
    variables: ['message', 'buttonText', 'buttonUrl'],
    content: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '😢', size: '3xl', align: 'center' },
          { type: 'text', text: 'เสียใจด้วย', weight: 'bold', size: 'xxl', color: '#ffffff', align: 'center', margin: 'md' }
        ],
        backgroundColor: '#95A5A6',
        paddingAll: '20px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'ไม่ได้รับรางวัลในครั้งนี้', size: 'lg', weight: 'bold', align: 'center' },
          { type: 'separator', margin: 'xl' },
          { type: 'text', text: '{{message}}', size: 'sm', align: 'center', margin: 'lg', color: '#888888', wrap: true },
          { type: 'text', text: 'ลุ้นใหม่ครั้งหน้านะคะ 💪', size: 'sm', align: 'center', margin: 'md', color: '#555555' }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: { type: 'uri', label: '{{buttonText}}', uri: '{{buttonUrl}}' },
            style: 'secondary'
          }
        ],
        paddingAll: '10px'
      }
    }
  },
  {
    name: 'ข้อความโปรโมชั่น',
    description: 'แจ้งโปรโมชั่นพิเศษ',
    category: 'promotion',
    type: 'flex',
    variables: ['title', 'description', 'imageUrl', 'buttonText', 'buttonUrl'],
    content: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: '{{imageUrl}}',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '{{title}}', weight: 'bold', size: 'xl', wrap: true },
          { type: 'text', text: '{{description}}', size: 'sm', color: '#666666', margin: 'lg', wrap: true }
        ],
        paddingAll: '20px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: { type: 'uri', label: '{{buttonText}}', uri: '{{buttonUrl}}' },
            style: 'primary',
            color: '#E74C3C'
          }
        ],
        paddingAll: '10px'
      }
    }
  }
];

// Convert DEFAULT_TEMPLATES to MessageTemplate format
function getFixedTemplates(): MessageTemplate[] {
  const now = new Date().toISOString();
  return DEFAULT_TEMPLATES.map((t, index) => ({
    id: `fixed-${index + 1}`,
    name: t.name,
    description: t.description,
    category: t.category,
    type: t.type,
    content: JSON.stringify(t.content),
    variables: JSON.stringify(t.variables),
    is_active: 1,
    created_at: now,
    updated_at: now,
  }));
}

export class MessageTemplateService {
  constructor(private db: D1Database, private env: Env) {}

  async findAll(category?: string): Promise<MessageTemplate[]> {
    // Use fixed templates instead of DB
    let templates = getFixedTemplates();
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    return templates;
  }

  async findById(id: string): Promise<MessageTemplate | null> {
    // Use fixed templates instead of DB
    const templates = getFixedTemplates();
    return templates.find(t => t.id === id) || null;
  }

  async create(data: {
    name: string;
    description?: string;
    category: string;
    type?: string;
    content: object;
    variables?: string[];
  }): Promise<MessageTemplate> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO message_templates (id, name, description, category, type, content, variables, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.description || null,
        data.category,
        data.type || 'flex',
        JSON.stringify(data.content),
        data.variables ? JSON.stringify(data.variables) : null,
        now,
        now
      )
      .run();

    return (await this.findById(id))!;
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    category: string;
    content: object;
    variables: string[];
    isActive: boolean;
  }>): Promise<MessageTemplate | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.category !== undefined) { updates.push('category = ?'); values.push(data.category); }
    if (data.content !== undefined) { updates.push('content = ?'); values.push(JSON.stringify(data.content)); }
    if (data.variables !== undefined) { updates.push('variables = ?'); values.push(JSON.stringify(data.variables)); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await this.db
      .prepare(`UPDATE message_templates SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM message_templates WHERE id = ?').bind(id).run();
    return result.meta.changes > 0;
  }

  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const template of DEFAULT_TEMPLATES) {
      // Check if exists by name
      const existing = await this.db
        .prepare('SELECT id FROM message_templates WHERE name = ?')
        .bind(template.name)
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await this.create({
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        content: template.content,
        variables: template.variables,
      });
      created++;
    }

    return { created, skipped };
  }

  // Replace variables in template content
  renderTemplate(template: MessageTemplate, variables: Record<string, string>): object {
    let contentStr = template.content;
    
    for (const [key, value] of Object.entries(variables)) {
      contentStr = contentStr.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    const content = JSON.parse(contentStr) as Record<string, unknown>;
    
    // Remove footer if buttonUrl is empty or not provided
    if (content.footer && (!variables.buttonUrl || variables.buttonUrl.trim() === '')) {
      delete content.footer;
    }
    
    return content;
  }
}
