import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameTemplateDocument = GameTemplate & Document;

export enum TemplateType {
  GRID_2X2 = 'grid_2x2',         // หาภาพแปลกปลอม (4 ช่อง)
  QUESTION_1_3 = 'question_1_3', // ทายภาพซูม, จับคู่ภาพ, ทายเงา (1 รูปบน + 3 ตัวเลือก)
  TAP_ZONE = 'tap_zone',         // หาของที่ซ่อน (กดผิด = จบเกม)
  COMPARE_1X2 = 'compare_1x2',   // เปรียบเทียบ 2 ภาพ (ภาพ A vs ภาพ B)
}

export interface HeaderConfig {
  title: string;
  subtitle?: string;
  bgColor: string;
  textColor: string;
  height: number;
}

export interface ContentConfig {
  layout: string; // "2x2", "1+3", "full"
  labels?: string[];
  borderRadius?: number;
  gap?: number;
}

export interface ClickableArea {
  position: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Schema({ timestamps: true })
export class GameTemplate {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: TemplateType })
  type: TemplateType;

  @Prop({ type: Object, required: true })
  header: HeaderConfig;

  @Prop({ type: Object, required: true })
  content: ContentConfig;

  @Prop({ type: [Object], required: true })
  clickableAreas: ClickableArea[];

  // จำนวน zones ที่คลิกได้
  @Prop({ required: true })
  totalZones: number;

  // สำหรับ TAP_ZONE: กดผิดครั้งเดียว = จบเกม
  @Prop({ default: false })
  singleAttempt: boolean;

  // URL รูป template (ใช้ composite กับรูป content)
  @Prop()
  templateImageUrl?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const GameTemplateSchema = SchemaFactory.createForClass(GameTemplate);
