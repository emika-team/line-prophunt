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
  BadRequestException,
} from '@nestjs/common';
import { GameService } from '../game/game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { BroadcastGameDto } from './dto/broadcast-game.dto';
import { RewardStatus } from '../game/schemas/game-session.schema';

@Controller('admin')
export class AdminController {
  constructor(private readonly gameService: GameService) {}

  // Dashboard
  @Get('dashboard')
  async getDashboard(@Query('groupId') groupId?: string) {
    const gameStats = await this.gameService.getDashboardStats(groupId);
    return { game: gameStats };
  }

  // ============ Templates CRUD ============
  @Get('templates')
  async getTemplates() {
    return this.gameService.findAllTemplates();
  }

  @Get('templates/:id')
  async getTemplate(@Param('id') id: string) {
    const template = await this.gameService.findTemplateById(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    return this.gameService.createTemplate(createTemplateDto);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: Partial<CreateTemplateDto>,
  ) {
    const template = await this.gameService.updateTemplate(id, updateTemplateDto);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string) {
    const deleted = await this.gameService.deleteTemplate(id);
    if (!deleted) {
      throw new NotFoundException('Template not found');
    }
  }

  // ============ Games CRUD ============
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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
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

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    const sessions = await this.gameService.findAllSessions(filters);
    
    // Transform to expected format
    const transformedSessions = sessions.map((session: any) => ({
      _id: session._id,
      player: session.playerId,
      game: session.gameId,
      answer: session.answer,
      isCorrect: session.isCorrect,
      rewardStatus: session.rewardStatus?.toLowerCase(),
      createdAt: session.createdAt,
    }));

    const total = transformedSessions.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedData = transformedSessions.slice(startIndex, startIndex + limitNum);

    return {
      data: paginatedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    };
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

  // Broadcast Game
  @Post('games/:id/broadcast')
  async broadcastGame(
    @Param('id') id: string,
    @Body() broadcastDto: BroadcastGameDto,
  ) {
    try {
      return await this.gameService.broadcastGame(
        id,
        broadcastDto.customKeys,
        broadcastDto.customMessage,
      );
    } catch (error) {
      if (error.message === 'Game not found') {
        throw new NotFoundException('Game not found');
      }
      throw new BadRequestException(error.message);
    }
  }
}
