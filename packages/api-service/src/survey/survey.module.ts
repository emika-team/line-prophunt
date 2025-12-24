import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SurveyService } from './survey.service';
import {
  SurveySession,
  SurveySessionSchema,
} from './schemas/survey-session.schema';
import {
  SurveyResponse,
  SurveyResponseSchema,
} from './schemas/survey-response.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SurveySession.name, schema: SurveySessionSchema },
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
    ]),
  ],
  providers: [SurveyService],
  exports: [SurveyService],
})
export class SurveyModule {}
