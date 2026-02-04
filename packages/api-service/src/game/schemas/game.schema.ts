import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GameDocument = Game & Document;

// Custom zone สำหรับ TAP_ZONE template
export interface CustomZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Schema({ timestamps: true })
export class Game {
  @Prop({ required: true })
  name: string;

  // Reference to template
  @Prop({ type: Types.ObjectId, ref: 'GameTemplate', required: true })
  templateId: Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

  // Image dimensions for LINE Imagemap (max 1040x1040)
  @Prop({ default: 1040 })
  imageWidth: number;

  @Prop({ default: 1040 })
  imageHeight: number;

  // Correct position (1 to totalZones from template)
  @Prop({ required: true, min: 1 })
  correctPosition: number;

  // Custom zone สำหรับ TAP_ZONE (override template's clickable area)
  @Prop({ type: Object })
  customZone?: CustomZone;

  // Callback URL สำหรับส่งเมื่อผู้เล่นชนะ
  @Prop()
  winCallbackUrl?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const GameSchema = SchemaFactory.createForClass(Game);
