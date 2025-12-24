import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ProxyCallback {
  url: string;
  secret: string;
}

export interface ProxyResponse {
  traceId: string;
  response: string | object;
  humanInLoop?: boolean;
}

@Injectable()
export class ProxyClientService {
  private readonly logger = new Logger(ProxyClientService.name);

  async sendResponse(
    callback: ProxyCallback,
    traceId: string,
    response: string | object,
    humanInLoop = false,
  ): Promise<void> {
    const payload: ProxyResponse = {
      traceId,
      response,
      humanInLoop,
    };

    try {
      await axios.post(`${callback.url}/chats`, payload, {
        headers: {
          Authorization: `Bearer ${callback.secret}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`Response sent for traceId: ${traceId}`);
    } catch (error) {
      this.logger.error(`Failed to send response: ${error.message}`);
      throw error;
    }
  }

  async sendTextMessage(
    callback: ProxyCallback,
    traceId: string,
    text: string,
  ): Promise<void> {
    return this.sendResponse(callback, traceId, text);
  }

  async sendImageMessage(
    callback: ProxyCallback,
    traceId: string,
    imageUrl: string,
    text?: string,
  ): Promise<void> {
    const response = {
      type: 'image',
      url: imageUrl,
      text,
    };
    return this.sendResponse(callback, traceId, response);
  }

  async sendFlexMessage(
    callback: ProxyCallback,
    traceId: string,
    flexContent: object,
    altText: string,
  ): Promise<void> {
    const response = {
      type: 'flex',
      altText,
      contents: flexContent,
    };
    return this.sendResponse(callback, traceId, response);
  }

  // Survey Rating Flex Message (1-5 stars)
  createSurveyRatingFlex(title: string, subtitle: string): object {
    return {
      type: 'bubble',
      size: 'compact',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            align: 'center',
          },
          {
            type: 'text',
            text: subtitle,
            size: 'sm',
            color: '#666666',
            align: 'center',
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [1, 2, 3, 4, 5].map((num) => ({
          type: 'button',
          style: 'primary',
          color: num <= 2 ? '#FF6B6B' : num === 3 ? '#FFE66D' : '#4ECDC4',
          height: 'sm',
          action: {
            type: 'message',
            label: `${num}`,
            text: `${num}`,
          },
        })),
      },
    };
  }

  // Thank You Flex Message
  createThankYouFlex(message: string, score: number): object {
    const stars = '⭐'.repeat(score);
    return {
      type: 'bubble',
      size: 'compact',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: stars,
            size: 'xl',
            align: 'center',
          },
          {
            type: 'text',
            text: message,
            weight: 'bold',
            size: 'md',
            align: 'center',
            margin: 'md',
            color: '#4ECDC4',
          },
        ],
      },
    };
  }
}
