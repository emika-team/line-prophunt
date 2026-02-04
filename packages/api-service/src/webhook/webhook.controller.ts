import { Controller, Post, Body, Headers, HttpCode, Logger } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { GameService } from '../game/game.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly gameService: GameService) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-event') event: string,
  ) {
    this.logger.log(`Webhook received: event=${payload.event}`);

    // Handle postback event from LINE (user clicked on game)
    if (payload.event === 'postback' && payload.data) {
      return this.handlePostback(payload);
    }

    return { status: 'ok', handled: false };
  }

  private async handlePostback(payload: WebhookPayloadDto) {
    const params = new URLSearchParams(payload.data);
    const action = params.get('action');
    const position = params.get('position');
    const gameId = params.get('gameId');

    this.logger.log(`Postback: action=${action}, position=${position}, gameId=${gameId}`);

    if (action === 'answer' && position && gameId) {
      const customKey = payload.key_value;

      if (!customKey) {
        this.logger.warn('No customKey in postback payload');
        return { status: 'ok', handled: false };
      }

      await this.gameService.handlePostbackAnswer(customKey, parseInt(position, 10), gameId);
      return { status: 'ok' };
    }

    return { status: 'ok', handled: false };
  }
}
