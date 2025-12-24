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
}
