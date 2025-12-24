import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { GameService } from '../game/game.service';
import { SurveyService } from '../survey/survey.service';

@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly gameService: GameService,
    private readonly surveyService: SurveyService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() payload: WebhookPayloadDto,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-event') event: string,
  ) {
    const { data } = payload;
    const message = data.chat.message.trim().toLowerCase();

    // Check if user is in survey session
    const surveySession = await this.surveyService.getActiveSession(
      data.customer.id,
      data.groupId,
    );

    if (surveySession) {
      await this.surveyService.handleMessage(data);
      return { status: 'ok' };
    }

    // Check if user is in game session or wants to play
    const playerSession = await this.gameService.getPlayerState(
      data.customer.id,
      data.groupId,
    );

    if (playerSession?.state === 'PLAYING') {
      await this.gameService.handleAnswer(data);
      return { status: 'ok' };
    }

    // Check for game trigger keywords
    const gameKeywords = ['เล่น', 'เล่นเกม', 'play', 'game'];
    if (gameKeywords.includes(message)) {
      await this.gameService.startGame(data);
      return { status: 'ok' };
    }

    // Check for survey trigger
    const surveyKeywords = ['survey', 'แบบสอบถาม', 'ให้คะแนน'];
    if (surveyKeywords.includes(message)) {
      await this.surveyService.startSurvey(data);
      return { status: 'ok' };
    }

    return { status: 'ok', handled: false };
  }
}
