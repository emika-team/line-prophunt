import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameService } from './game.service';
import { Player, PlayerSchema } from './schemas/player.schema';
import { Game, GameSchema } from './schemas/game.schema';
import { GameSession, GameSessionSchema } from './schemas/game-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Game.name, schema: GameSchema },
      { name: GameSession.name, schema: GameSessionSchema },
    ]),
  ],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
