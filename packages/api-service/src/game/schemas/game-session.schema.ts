import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GameSessionDocument = GameSession & Document;

export enum RewardStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

@Schema({ timestamps: true })
export class GameSession {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true })
  playerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Game', required: true })
  gameId: Types.ObjectId;

  @Prop({ required: true })
  groupId: string;

  @Prop({ type: Number, default: null })
  answer: number | null;

  @Prop({ type: Boolean, default: null })
  isCorrect: boolean | null;

  @Prop({ type: String, enum: RewardStatus, default: null })
  rewardStatus: RewardStatus | null;

  @Prop({ type: Date, default: null })
  answeredAt: Date | null;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);

GameSessionSchema.index({ playerId: 1, gameId: 1 });
GameSessionSchema.index({ groupId: 1, createdAt: -1 });
GameSessionSchema.index({ isCorrect: 1, rewardStatus: 1 });
