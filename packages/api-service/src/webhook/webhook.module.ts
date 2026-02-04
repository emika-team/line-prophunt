import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { GameModule } from '../game/game.module';

@Module({
  imports: [forwardRef(() => GameModule)],
  controllers: [WebhookController],
})
export class WebhookModule {}
