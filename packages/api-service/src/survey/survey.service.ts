import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import {
  SurveySession,
  SurveySessionDocument,
  SurveySessionStatus,
} from './schemas/survey-session.schema';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from './schemas/survey-response.schema';
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
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);
  private readonly surveyQuestion: string;
  private readonly surveyThankYou: string;

  constructor(
    @InjectModel(SurveySession.name)
    private surveySessionModel: Model<SurveySessionDocument>,
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    private proxyClient: ProxyClientService,
    private configService: ConfigService,
  ) {
    this.surveyQuestion = this.configService.get<string>(
      'SURVEY_QUESTION',
      'กรุณาให้คะแนนบริการของเรา 1-5 คะแนน',
    );
    this.surveyThankYou = this.configService.get<string>(
      'SURVEY_THANK_YOU',
      'ขอบคุณสำหรับความคิดเห็นครับ!',
    );
  }

  async getActiveSession(
    customerId: string,
    groupId: string,
  ): Promise<SurveySessionDocument | null> {
    return this.surveySessionModel.findOne({
      customerId,
      groupId,
      status: SurveySessionStatus.WAITING_RESPONSE,
    });
  }

  async startSurvey(data: WebhookData): Promise<void> {
    const { customer, groupId, callback, traceId } = data;

    // Check if already has active session
    const existingSession = await this.getActiveSession(customer.id, groupId);
    if (existingSession) {
      // Send Flex Message for rating
      const flexContent = this.proxyClient.createSurveyRatingFlex(
        'ให้คะแนนบริการ',
        this.surveyQuestion,
      );
      await this.proxyClient.sendFlexMessage(
        callback,
        traceId,
        flexContent,
        this.surveyQuestion,
      );
      return;
    }

    // Create new session
    await this.surveySessionModel.create({
      customerId: customer.id,
      displayName: customer.displayName,
      groupId,
      status: SurveySessionStatus.WAITING_RESPONSE,
    });

    // Send Flex Message for rating
    const flexContent = this.proxyClient.createSurveyRatingFlex(
      'ให้คะแนนบริการ',
      this.surveyQuestion,
    );
    await this.proxyClient.sendFlexMessage(
      callback,
      traceId,
      flexContent,
      this.surveyQuestion,
    );
  }

  async handleMessage(data: WebhookData): Promise<void> {
    const { customer, groupId, callback, traceId, chat } = data;

    const session = await this.getActiveSession(customer.id, groupId);
    if (!session) {
      return;
    }

    const score = parseInt(chat.message.trim(), 10);
    if (isNaN(score) || score < 1 || score > 5) {
      await this.proxyClient.sendTextMessage(
        callback,
        traceId,
        'กรุณาตอบเป็นตัวเลข 1-5',
      );
      return;
    }

    // Save response
    await this.surveyResponseModel.create({
      sessionId: session._id,
      customerId: customer.id,
      displayName: customer.displayName,
      groupId,
      score,
    });

    // Update session status
    await this.surveySessionModel.updateOne(
      { _id: session._id },
      { status: SurveySessionStatus.COMPLETED },
    );

    // Send thank you with Flex Message
    const thankYouFlex = this.proxyClient.createThankYouFlex(
      this.surveyThankYou,
      score,
    );
    await this.proxyClient.sendFlexMessage(
      callback,
      traceId,
      thankYouFlex,
      this.surveyThankYou,
    );
  }

  // Admin methods
  async getSurveyStats(groupId?: string): Promise<{
    totalResponses: number;
    averageScore: number;
    scoreDistribution: { score: number; count: number }[];
  }> {
    const matchQuery = groupId ? { groupId } : {};

    const [totalResponses, avgResult, distribution] = await Promise.all([
      this.surveyResponseModel.countDocuments(matchQuery),
      this.surveyResponseModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, avg: { $avg: '$score' } } },
      ]),
      this.surveyResponseModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$score', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      totalResponses,
      averageScore: avgResult[0]?.avg || 0,
      scoreDistribution: distribution.map((d) => ({
        score: d._id,
        count: d.count,
      })),
    };
  }

  async findAllResponses(groupId?: string): Promise<SurveyResponse[]> {
    const query = groupId ? { groupId } : {};
    return this.surveyResponseModel.find(query).sort({ createdAt: -1 });
  }
}
