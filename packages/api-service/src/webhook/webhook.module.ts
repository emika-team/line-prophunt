import { Module, forwardRef } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { GameModule } from '../game/game.module';
import { SurveyModule } from '../survey/survey.module';

@Module({
  imports: [forwardRef(() => GameModule), forwardRef(() => SurveyModule)],
  controllers: [WebhookController],
})
export class WebhookModule {}
