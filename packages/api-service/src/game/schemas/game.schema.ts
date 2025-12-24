import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameDocument = Game & Document;

@Schema({ timestamps: true })
export class Game {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true, min: 1, max: 3 })
  correctPosition: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const GameSchema = SchemaFactory.createForClass(Game);
