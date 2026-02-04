import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GameService } from './game/game.service';
import { TemplateType } from './game/schemas/game-template.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const gameService = app.get(GameService);

  console.log('Seeding game templates...');

  const templates = [
    // Template A: Grid 2x2 - หาภาพแปลกปลอม
    {
      name: 'หาภาพแปลกปลอม (Grid 2x2)',
      description: '4 รูปเรียงกัน มี 1 รูปที่แตกต่าง ให้กดรูปที่ต่าง',
      type: TemplateType.GRID_2X2,
      header: {
        title: 'หาภาพที่แตกต่างจากพวก!',
        subtitle: 'กดเลือกภาพที่คิดว่าต่าง',
        bgColor: '#E8F4FD',
        textColor: '#1E4B8E',
        height: 150,
      },
      content: {
        layout: '2x2',
        labels: ['1', '2', '3', '4'],
        borderRadius: 12,
        gap: 20,
      },
      clickableAreas: [
        { position: 1, x: 50, y: 160, width: 420, height: 420 },
        { position: 2, x: 570, y: 160, width: 420, height: 420 },
        { position: 3, x: 50, y: 620, width: 420, height: 420 },
        { position: 4, x: 570, y: 620, width: 420, height: 420 },
      ],
      totalZones: 4,
      singleAttempt: false,
      isActive: true,
    },
    // Template B: 1+3 Layout - ทายภาพซูม, จับคู่ภาพ, ทายเงา
    {
      name: 'ทายภาพ (1+3 Layout)',
      description: '1 รูปโจทย์ด้านบน + 3 ตัวเลือกด้านล่าง สำหรับเกมทายภาพซูม, จับคู่ภาพ, ทายเงา',
      type: TemplateType.QUESTION_1_3,
      header: {
        title: 'นี่คืออะไร?',
        subtitle: 'กดเลือกคำตอบที่ถูกต้อง',
        bgColor: '#E8F4FD',
        textColor: '#1E4B8E',
        height: 120,
      },
      content: {
        layout: '1+3',
        labels: ['A', 'B', 'C'],
        borderRadius: 12,
        gap: 30,
      },
      clickableAreas: [
        // รูปโจทย์ด้านบนไม่ clickable
        // 3 ตัวเลือกด้านล่าง
        { position: 1, x: 40, y: 680, width: 300, height: 300 },
        { position: 2, x: 370, y: 680, width: 300, height: 300 },
        { position: 3, x: 700, y: 680, width: 300, height: 300 },
      ],
      totalZones: 3,
      singleAttempt: false,
      isActive: true,
    },
    // Template C: Tap Zone - หาของที่ซ่อน
    {
      name: 'หาของที่ซ่อน (Tap Zone)',
      description: 'รูปเต็มจอ กดจุดที่ของซ่อนอยู่ กดผิด = จบเกม!',
      type: TemplateType.TAP_ZONE,
      header: {
        title: 'หาสิ่งที่ซ่อนอยู่!',
        subtitle: '⚠️ กดผิด = จบเกม!',
        bgColor: '#FFF3E0',
        textColor: '#E65100',
        height: 100,
      },
      content: {
        layout: 'full',
        borderRadius: 0,
        gap: 0,
      },
      // Default clickable area (admin จะกำหนด customZone เอง)
      clickableAreas: [
        { position: 1, x: 0, y: 100, width: 1040, height: 940 },
      ],
      totalZones: 1,
      singleAttempt: true, // กดผิดครั้งเดียว = จบเกม
      isActive: true,
    },
    // Template D: Compare 1x2 - เปรียบเทียบ 2 ภาพ
    {
      name: 'เปรียบเทียบ 2 ภาพ (1x2)',
      description: '2 ภาพเรียงกัน ภาพ A vs ภาพ B เลือกภาพที่ถูกต้อง',
      type: TemplateType.COMPARE_1X2,
      header: {
        title: 'เลือกภาพที่ถูกต้อง!',
        subtitle: 'กดเลือก ภาพ A หรือ ภาพ B',
        bgColor: '#E8F4FD',
        textColor: '#1E4B8E',
        height: 120,
      },
      content: {
        layout: '1x2',
        labels: ['ภาพ A', 'ภาพ B'],
        borderRadius: 12,
        gap: 20,
      },
      clickableAreas: [
        { position: 1, x: 30, y: 180, width: 480, height: 800 },  // ภาพ A (ซ้าย)
        { position: 2, x: 530, y: 180, width: 480, height: 800 }, // ภาพ B (ขวา)
      ],
      totalZones: 2,
      singleAttempt: false,
      isActive: true,
    },
  ];

  for (const templateData of templates) {
    try {
      const existing = await gameService.findAllTemplates();
      const found = existing.find(t => t.name === templateData.name);
      
      if (found) {
        console.log(`Template "${templateData.name}" already exists, skipping...`);
      } else {
        await gameService.createTemplate(templateData);
        console.log(`Created template: ${templateData.name}`);
      }
    } catch (error) {
      console.error(`Error creating template "${templateData.name}":`, error.message);
    }
  }

  console.log('Seed completed!');
  await app.close();
}

seed().catch(console.error);
