import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

export class CreateGameDto {
  @IsString()
  name: string;

  @IsUrl()
  imageUrl: string;

  @IsNumber()
  @Min(1)
  @Max(3)
  correctPosition: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
