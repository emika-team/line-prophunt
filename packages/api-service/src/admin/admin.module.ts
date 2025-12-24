import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { GameModule } from '../game/game.module';
import { SurveyModule } from '../survey/survey.module';

@Module({
  imports: [GameModule, SurveyModule],
  controllers: [AdminController],
})
export class AdminModule {}
