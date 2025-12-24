import { IsString, IsObject, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class ChatDto {
  @IsString()
  chatId: string;

  @IsString()
  message: string;

  @IsArray()
  @IsOptional()
  attachments?: any[];
}

class CustomerDto {
  @IsString()
  id: string;

  @IsString()
  displayName: string;
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
  chat: ChatDto;

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

  @ValidateNested()
  @Type(() => WebhookDataDto)
  data: WebhookDataDto;
}
