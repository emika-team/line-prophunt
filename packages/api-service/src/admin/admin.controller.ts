import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { GameService } from '../game/game.service';
import { SurveyService } from '../survey/survey.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RewardStatus } from '../game/schemas/game-session.schema';

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly gameService: GameService,
    private readonly surveyService: SurveyService,
  ) {}

  // Dashboard
  @Get('dashboard')
  async getDashboard(@Query('groupId') groupId?: string) {
    const [gameStats, surveyStats] = await Promise.all([
      this.gameService.getDashboardStats(groupId),
      this.surveyService.getSurveyStats(groupId),
    ]);

    return {
      game: gameStats,
      survey: surveyStats,
    };
  }

  // Games CRUD
  @Get('games')
  async getGames() {
    return this.gameService.findAllGames();
  }

  @Get('games/:id')
  async getGame(@Param('id') id: string) {
    const game = await this.gameService.findGameById(id);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  @Post('games')
  @HttpCode(HttpStatus.CREATED)
  async createGame(@Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(createGameDto);
  }

  @Put('games/:id')
  async updateGame(
    @Param('id') id: string,
    @Body() updateGameDto: UpdateGameDto,
  ) {
    const game = await this.gameService.updateGame(id, updateGameDto);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  @Delete('games/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGame(@Param('id') id: string) {
    const deleted = await this.gameService.deleteGame(id);
    if (!deleted) {
      throw new NotFoundException('Game not found');
    }
  }

  // Game Sessions
  @Get('sessions')
  async getSessions(
    @Query('winnersOnly') winnersOnly?: string,
    @Query('rewardStatus') rewardStatus?: RewardStatus,
    @Query('groupId') groupId?: string,
  ) {
    const filters: {
      isCorrect?: boolean;
      rewardStatus?: RewardStatus;
      groupId?: string;
    } = {};

    if (winnersOnly === 'true') {
      filters.isCorrect = true;
    }
    if (rewardStatus) {
      filters.rewardStatus = rewardStatus;
    }
    if (groupId) {
      filters.groupId = groupId;
    }

    return this.gameService.findAllSessions(filters);
  }

  @Put('sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    const session = await this.gameService.updateSessionRewardStatus(
      id,
      updateSessionDto.rewardStatus,
    );
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  // Players
  @Get('players')
  async getPlayers(@Query('groupId') groupId?: string) {
    return this.gameService.findAllPlayers(groupId);
  }

  // Survey Responses
  @Get('survey/responses')
  async getSurveyResponses(@Query('groupId') groupId?: string) {
    return this.surveyService.findAllResponses(groupId);
  }

  @Get('survey/stats')
  async getSurveyStats(@Query('groupId') groupId?: string) {
    return this.surveyService.getSurveyStats(groupId);
  }
}
