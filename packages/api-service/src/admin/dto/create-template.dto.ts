import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateType } from '../../game/schemas/game-template.schema';

export class HeaderConfigDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  bgColor: string;

  @IsString()
  textColor: string;

  @IsNumber()
  @Min(0)
  height: number;
}

export class ContentConfigDto {
  @IsString()
  layout: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsNumber()
  @IsOptional()
  borderRadius?: number;

  @IsNumber()
  @IsOptional()
  gap?: number;
}

export class ClickableAreaDto {
  @IsNumber()
  @Min(1)
  position: number;

  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;
}

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(TemplateType)
  type: TemplateType;

  @ValidateNested()
  @Type(() => HeaderConfigDto)
  header: HeaderConfigDto;

  @ValidateNested()
  @Type(() => ContentConfigDto)
  content: ContentConfigDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClickableAreaDto)
  clickableAreas: ClickableAreaDto[];

  @IsNumber()
  @Min(1)
  totalZones: number;

  @IsBoolean()
  @IsOptional()
  singleAttempt?: boolean;

  @IsUrl()
  @IsOptional()
  templateImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
