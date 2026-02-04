import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class BroadcastGameDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  customKeys: string[];

  @IsString()
  @IsOptional()
  customMessage?: string;
}
