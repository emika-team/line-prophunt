import { Module, Global } from '@nestjs/common';
import { ProxyClientService } from './proxy-client.service';

@Global()
@Module({
  providers: [ProxyClientService],
  exports: [ProxyClientService],
})
export class ProxyClientModule {}
