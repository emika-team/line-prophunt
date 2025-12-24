import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player, PlayerDocument, PlayerState } from './schemas/player.schema';
import { Game, GameDocument } from './schemas/game.schema';
import {
  GameSession,
  GameSessionDocument,
  RewardStatus,
} from './schemas/game-session.schema';
import { ProxyClientService } from '../proxy-client/proxy-client.service';

interface WebhookData {
  groupId: string;
  traceId: string;
  chat: {
    chatId: string;
    message: string;
  };
  customer: {
    id: string;
    displayName: string;
  };
  callback: {
    url: string;
    secret: string;
  };
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    @InjectModel(Game.name) private gameModel: Model<GameDocument>,
    @InjectModel(GameSession.name)
    private gameSessionModel: Model<GameSessionDocument>,
    private proxyClient: ProxyClientService,
  ) {}

  async getPlayerState(
    customerId: string,
    groupId: string,
  ): Promise<Player | null> {
    return this.playerModel.findOne({ customerId, groupId });
  }

  async startGame(data: WebhookData): Promise<void> {
    const { customer, groupId, callback, traceId } = data;

    // Find active game
    const activeGame = await this.gameModel.findOne({ isActive: true });
    if (!activeGame) {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'ขออภัย ตอนนี้ยังไม่มีเกมให้เล่น',
      );
      return;
    }

    // Get or create player
    let player = await this.playerModel.findOne({
      customerId: customer.id,
      groupId,
    });

    if (!player) {
      player = await this.playerModel.create({
        customerId: customer.id,
        displayName: customer.displayName,
        groupId,
        state: PlayerState.IDLE,
      });
    }

    // Check if player already played this game
    const existingSession = await this.gameSessionModel.findOne({
      playerId: player._id,
      gameId: activeGame._id,
    });

    if (existingSession) {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'คุณได้เล่นเกมนี้แล้ว ขอบคุณที่ร่วมสนุก!',
      );
      return;
    }

    // Create game session
    await this.gameSessionModel.create({
      playerId: player._id,
      gameId: activeGame._id,
      groupId,
    });

    // Update player state
    await this.playerModel.updateOne(
      { _id: player._id },
      { state: PlayerState.PLAYING, currentGameId: activeGame._id.toString() },
    );

    // Send game image and instructions
    await this.proxyClient.sendImageMessage(
      callback,
      traceId,
      activeGame.imageUrl,
      'หาจุดผิด! ตอบ 1, 2, หรือ 3',
    );
  }

  async handleAnswer(data: WebhookData): Promise<void> {
    const { customer, groupId, callback, traceId, chat } = data;

    const player = await this.playerModel.findOne({
      customerId: customer.id,
      groupId,
    });

    if (!player || player.state !== PlayerState.PLAYING) {
      return;
    }

    const answer = parseInt(chat.message.trim(), 10);
    if (isNaN(answer) || answer < 1 || answer > 3) {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'กรุณาตอบ 1, 2, หรือ 3',
      );
      return;
    }

    const game = await this.gameModel.findById(player.currentGameId);
    if (!game) {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'เกิดข้อผิดพลาด กรุณาลองใหม่',
      );
      return;
    }

    const isCorrect = answer === game.correctPosition;

    // Update game session
    await this.gameSessionModel.updateOne(
      { playerId: player._id, gameId: game._id },
      {
        answer,
        isCorrect,
        rewardStatus: isCorrect ? RewardStatus.PENDING : null,
        answeredAt: new Date(),
      },
    );

    // Update player state
    await this.playerModel.updateOne(
      { _id: player._id },
      { state: PlayerState.ANSWERED, currentGameId: null },
    );

    // Send response
    if (isCorrect) {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'ยินดีด้วย! ตอบถูกแล้ว รอ admin แจ้งรางวัลนะ',
      );
    } else {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'เสียใจด้วย ตอบผิด ลองใหม่นะ!',
      );
    }
  }

  // Admin methods
  async findAllGames(): Promise<Game[]> {
    return this.gameModel.find().sort({ createdAt: -1 });
  }

  async findGameById(id: string): Promise<Game | null> {
    return this.gameModel.findById(id);
  }

  async createGame(data: Partial<Game>): Promise<Game> {
    return this.gameModel.create(data);
  }

  async updateGame(id: string, data: Partial<Game>): Promise<Game | null> {
    return this.gameModel.findByIdAndUpdate(id, data, { new: true });
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
}
