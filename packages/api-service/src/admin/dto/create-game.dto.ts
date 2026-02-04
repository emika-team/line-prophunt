import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsUrl,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CustomZoneDto {
  @IsNumber()
  @Min(0)
  x: number;

  @IsNumber()
  @Min(0)
  y: number;

  @IsNumber()
  @Min(10)
  width: number;

  @IsNumber()
  @Min(10)
  height: number;
}

export class CreateGameDto {
  @IsString()
  name: string;

  @IsMongoId()
  templateId: string;

  @IsUrl()
  imageUrl: string;

  // Image dimensions for LINE Imagemap (max 1040)
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(1040)
  imageWidth?: number;

  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(1040)
  imageHeight?: number;

  // Correct position (1 to totalZones from template)
  @IsNumber()
  @Min(1)
  correctPosition: number;

  // Custom zone สำหรับ TAP_ZONE template
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomZoneDto)
  customZone?: CustomZoneDto;

  // Callback URL สำหรับส่งเมื่อผู้เล่นชนะ
  @IsUrl()
  @IsOptional()
  winCallbackUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
