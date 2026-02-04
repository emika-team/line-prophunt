import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player, PlayerDocument, PlayerState } from './schemas/player.schema';
import { Game, GameDocument } from './schemas/game.schema';
import {
  GameSession,
  GameSessionDocument,
  RewardStatus,
} from './schemas/game-session.schema';
import { GameTemplate, GameTemplateDocument, TemplateType } from './schemas/game-template.schema';
import { OutboundService } from '../outbound/outbound.service';
import { CreateGameDto } from '../admin/dto/create-game.dto';
import { CreateTemplateDto } from '../admin/dto/create-template.dto';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    @InjectModel(GameSession.name)
    private gameSessionModel: Model<GameSessionDocument>,
    @InjectModel(GameTemplate.name)
    private gameTemplateModel: Model<GameTemplateDocument>,
    private outbound: OutboundService,
  ) {}

  // Handle postback answer directly from LINE (with gameId from postback data)
  // Creates session automatically if not exists
  async handlePostbackAnswer(customKey: string, position: number, gameId: string): Promise<void> {
    this.logger.log(`Postback answer: customKey=${customKey}, position=${position}, gameId=${gameId}`);

    // Find game
    const game = await this.gameModel.findById(gameId).populate('templateId');
    if (!game) {
      this.logger.warn(`Game not found: ${gameId}`);
      await this.outbound.sendText(customKey, 'เกมนี้ไม่มีแล้ว');
      return;
    }

    // Get or create player by customKey
    let player = await this.playerModel.findOne({ customKey });
    if (!player) {
      this.logger.log(`Creating new player for customKey: ${customKey}`);
      player = await this.playerModel.create({
        customerId: customKey,
        customKey,
        displayName: customKey,
        groupId: 'postback',
        state: PlayerState.PLAYING,
      });
    }

    // Get or create session
    let session = await this.gameSessionModel.findOne({
      playerId: player._id,
      gameId: game._id,
    });

    if (!session) {
      this.logger.log(`Creating new session for player ${player._id} and game ${gameId}`);
      session = await this.gameSessionModel.create({
        playerId: player._id,
        gameId: game._id,
        groupId: player.groupId || 'postback',
      });
    }

    // Check if already answered
    if (session.answer) {
      await this.outbound.sendText(customKey, 'คุณได้ตอบเกมนี้แล้ว ขอบคุณที่ร่วมสนุก!');
      return;
    }

    const isCorrect = position === game.correctPosition;

    const answeredAt = new Date();

    // Update session with answer
    await this.gameSessionModel.updateOne(
      { _id: session._id },
      {
        answer: position,
        isCorrect,
        rewardStatus: isCorrect ? RewardStatus.PENDING : null,
        answeredAt,
      },
    );

    // Update player state
    await this.playerModel.updateOne(
      { _id: player._id },
      { state: PlayerState.ANSWERED, currentGameId: null },
    );

    // Send win callback if configured and player won
    if (isCorrect && game.winCallbackUrl) {
      this.logger.log(`Sending win callback to ${game.winCallbackUrl} for ${customKey}`);
      const callbackResult = await this.outbound.sendWinCallback(game.winCallbackUrl, {
        customKey,
        gameId,
        gameName: game.name,
        answeredAt,
      });
      
      if (!callbackResult.success) {
        this.logger.warn(`Win callback failed: ${callbackResult.error}`);
      }
    }

    // Send result
    const resultFlex = this.outbound.createGameResultFlex(
      isCorrect,
      isCorrect
        ? 'ตอบถูกแล้ว! รอ admin แจ้งรางวัลนะ'
        : 'ตอบผิด ลองเกมหน้านะ!',
    );

    await this.outbound.sendFlex(
      customKey,
      resultFlex,
      isCorrect ? 'ยินดีด้วย! ตอบถูก!' : 'เสียใจด้วย ตอบผิด',
    );
  }

  // ============ Template Methods ============

  async findAllTemplates(): Promise<GameTemplate[]> {
    return this.gameTemplateModel.find({ isActive: true }).sort({ createdAt: -1 });
  }

  async findTemplateById(id: string): Promise<GameTemplate | null> {
    return this.gameTemplateModel.findById(id);
  }

  async createTemplate(data: CreateTemplateDto): Promise<GameTemplate> {
    return this.gameTemplateModel.create(data);
  }

  async updateTemplate(id: string, data: Partial<CreateTemplateDto>): Promise<GameTemplate | null> {
    return this.gameTemplateModel.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.gameTemplateModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // ============ Game Methods ============

  async findAllGames(): Promise<Game[]> {
    return this.gameModel.find().populate('templateId').sort({ createdAt: -1 });
  }

  async findGameById(id: string): Promise<Game | null> {
    return this.gameModel.findById(id).populate('templateId');
  }

  async createGame(data: CreateGameDto): Promise<Game> {
    // Validate template exists
    const template = await this.gameTemplateModel.findById(data.templateId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Validate correctPosition is within template's totalZones
    if (data.correctPosition > template.totalZones) {
      throw new Error(`correctPosition must be between 1 and ${template.totalZones}`);
    }

    return this.gameModel.create({
      ...data,
      templateId: new Types.ObjectId(data.templateId),
    });
  }

  async updateGame(id: string, data: Partial<CreateGameDto>): Promise<Game | null> {
    const updateData: any = { ...data };
    if (data.templateId) {
      updateData.templateId = new Types.ObjectId(data.templateId);
    }
    return this.gameModel.findByIdAndUpdate(id, updateData, { new: true }).populate('templateId');
  }

  async deleteGame(id: string): Promise<boolean> {
    const result = await this.gameModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async findAllPlayers(groupId?: string): Promise<Player[]> {
    const query = groupId ? { groupId } : {};
    return this.playerModel.find(query).sort({ createdAt: -1 });
  }

  async findAllSessions(filters?: {
    isCorrect?: boolean;
    rewardStatus?: RewardStatus;
    groupId?: string;
  }): Promise<GameSession[]> {
    const query: any = {};
    if (filters?.isCorrect !== undefined) query.isCorrect = filters.isCorrect;
    if (filters?.rewardStatus) query.rewardStatus = filters.rewardStatus;
    if (filters?.groupId) query.groupId = filters.groupId;

    return this.gameSessionModel
      .find(query)
      .populate('playerId')
      .populate('gameId')
      .sort({ createdAt: -1 });
  }

  async updateSessionRewardStatus(
    id: string,
    status: RewardStatus,
  ): Promise<GameSession | null> {
    return this.gameSessionModel.findByIdAndUpdate(
      id,
      { rewardStatus: status },
      { new: true },
    );
  }

  async getDashboardStats(groupId?: string): Promise<{
    totalPlayers: number;
    totalSessions: number;
    totalWinners: number;
    winRate: number;
  }> {
    const query = groupId ? { groupId } : {};

    const [totalPlayers, totalSessions, totalWinners] = await Promise.all([
      this.playerModel.countDocuments(query),
      this.gameSessionModel.countDocuments({
        ...query,
        answer: { $ne: null },
      }),
      this.gameSessionModel.countDocuments({ ...query, isCorrect: true }),
    ]);

    return {
      totalPlayers,
      totalSessions,
      totalWinners,
      winRate: totalSessions > 0 ? (totalWinners / totalSessions) * 100 : 0,
    };
  }

  // Broadcast game to multiple customers and create sessions
  async broadcastGame(
    gameId: string,
    customKeys: string[],
    customMessage?: string,
    groupId?: string,
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    sessionsCreated: number;
    results: Array<{ customKey: string; success: boolean; error?: string }>;
  }> {
    const game = await this.gameModel.findById(gameId).populate('templateId');
    if (!game) {
      throw new Error('Game not found');
    }

    const template = game.templateId as unknown as GameTemplate;
    if (!template) {
      throw new Error('Template not found');
    }

    const results: Array<{ customKey: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    let sessionsCreated = 0;

    // Determine clickable areas
    let clickableAreas = template.clickableAreas;
    if (template.type === TemplateType.TAP_ZONE && game.customZone) {
      clickableAreas = [{
        position: 1,
        ...game.customZone,
      }];
    }

    // Create Flex with clickable overlay (supports postback on image)
    const flexContent = this.outbound.createGameFlexWithOverlay(
      game.imageUrl,
      game.imageWidth || 1040,
      game.imageHeight || 1040,
      clickableAreas,
      gameId,
    );

    const altText = customMessage || `เกม ${game.name}`;
    const broadcastGroupId = groupId || 'broadcast';

    // Send to each customer and create session
    for (const customKey of customKeys) {
      try {
        // Get or create player by customKey
        let player = await this.playerModel.findOne({ customKey });

        if (!player) {
          player = await this.playerModel.create({
            customerId: customKey, // Use customKey as customerId if not exists
            customKey,
            displayName: customKey,
            groupId: broadcastGroupId,
            state: PlayerState.PLAYING,
          });
        }

        // Check if session already exists for this player and game
        const existingSession = await this.gameSessionModel.findOne({
          playerId: player._id,
          gameId: game._id,
        });

        if (!existingSession) {
          // Create game session
          await this.gameSessionModel.create({
            playerId: player._id,
            gameId: game._id,
            groupId: broadcastGroupId,
          });
          sessionsCreated++;

          // Update player state
          await this.playerModel.updateOne(
            { _id: player._id },
            { state: PlayerState.PLAYING, currentGameId: gameId },
          );
        }

        // Send flex message
        const result = await this.outbound.sendFlex(customKey, flexContent, altText);
        
        if (result.success) {
          sent++;
          results.push({ customKey, success: true });
        } else {
          failed++;
          results.push({
            customKey,
            success: false,
            error: result.error?.message || 'Unknown error',
          });
        }
      } catch (error) {
        failed++;
        results.push({
          customKey,
          success: false,
          error: error.message,
        });
      }
    }

    this.logger.log(`Broadcast game ${gameId}: sent=${sent}, failed=${failed}, sessionsCreated=${sessionsCreated}`);

    return {
      total: customKeys.length,
      sent,
      failed,
      sessionsCreated,
      results,
    };
  }
}
