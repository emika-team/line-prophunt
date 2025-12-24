import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SurveyResponseDocument = SurveyResponse & Document;

@Schema({ timestamps: true })
export class SurveyResponse {
  @Prop({ type: Types.ObjectId, ref: 'SurveySession', required: true })
  sessionId: Types.ObjectId;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  groupId: string;

  @Prop({ required: true, min: 1, max: 5 })
  score: number;
}

export const SurveyResponseSchema =
  SchemaFactory.createForClass(SurveyResponse);

SurveyResponseSchema.index({ groupId: 1, createdAt: -1 });
SurveyResponseSchema.index({ score: 1 });
