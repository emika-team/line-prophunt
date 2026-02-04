import { IsString, IsObject, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';

class ChatDto {
  @IsString()
  chatId: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsArray()
  @IsOptional()
  attachments?: any[];
}

class PostbackDataDto {
  @IsString()
  data: string;
}

class CustomerDto {
  @IsString()
  id: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  customKey?: string;
}

class CallbackDto {
  @IsString()
  url: string;

  @IsString()
  secret: string;
}

class WebhookDataDto {
  @IsString()
  groupId: string;

  @IsString()
  traceId: string;

  @ValidateNested()
  @Type(() => ChatDto)
  @IsOptional()
  chat?: ChatDto;

  @ValidateNested()
  @Type(() => PostbackDataDto)
  @IsOptional()
  postback?: PostbackDataDto;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ValidateNested()
  @Type(() => CallbackDto)
  callback: CallbackDto;
}

export class WebhookPayloadDto {
  @IsString()
  event: string;

  @IsString()
  @IsOptional()
  data?: string; // For postback: "action=answer&position=1&gameId=xxx"

  @IsString()
  @IsOptional()
  key_value?: string; // customKey

  @IsString()
  @IsOptional()
  customer_udid?: string;

  @IsString()
  @IsOptional()
  channel_id?: string;

  @IsObject()
  @IsOptional()
  raw?: any;

  // Legacy format support
  @ValidateNested()
  @Type(() => WebhookDataDto)
  @IsOptional()
  payload?: WebhookDataDto;
}
