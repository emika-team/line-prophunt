import { Module, Global } from '@nestjs/common';
import { OutboundService } from './outbound.service';

@Global()
@Module({
  providers: [OutboundService],
  exports: [OutboundService],
})
export class OutboundModule {}
