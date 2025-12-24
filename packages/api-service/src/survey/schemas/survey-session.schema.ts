import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SurveySessionDocument = SurveySession & Document;

export enum SurveySessionStatus {
  IDLE = 'IDLE',
  WAITING_RESPONSE = 'WAITING_RESPONSE',
  COMPLETED = 'COMPLETED',
}

@Schema({ timestamps: true })
export class SurveySession {
  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true, index: true })
  groupId: string;

  @Prop({
    type: String,
    enum: SurveySessionStatus,
    default: SurveySessionStatus.IDLE,
  })
  status: SurveySessionStatus;
}

export const SurveySessionSchema = SchemaFactory.createForClass(SurveySession);

SurveySessionSchema.index({ customerId: 1, groupId: 1 });
SurveySessionSchema.index({ status: 1 });
