import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookModule } from './webhook/webhook.module';
import { ProxyClientModule } from './proxy-client/proxy-client.module';
import { GameModule } from './game/game.module';
import { SurveyModule } from './survey/survey.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/prophunt',
        ),
      }),
      inject: [ConfigService],
    }),
    WebhookModule,
    ProxyClientModule,
    GameModule,
    SurveyModule,
    AdminModule,
  ],
})
export class AppModule {}
