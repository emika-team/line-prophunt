import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlayerDocument = Player & Document;

export enum PlayerState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  ANSWERED = 'ANSWERED',
}

@Schema({ timestamps: true })
export class Player {
  @Prop({ required: true, index: true })
  customerId: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true, index: true })
  groupId: string;

  @Prop({ type: String, enum: PlayerState, default: PlayerState.IDLE })
  state: PlayerState;

  @Prop({ type: String, default: null })
  currentGameId: string | null;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);

PlayerSchema.index({ customerId: 1, groupId: 1 }, { unique: true });
