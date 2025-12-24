import { IsEnum } from 'class-validator';
import { RewardStatus } from '../../game/schemas/game-session.schema';

export class UpdateSessionDto {
  @IsEnum(RewardStatus)
  rewardStatus: RewardStatus;
}
