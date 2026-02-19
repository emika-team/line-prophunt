import type { Env, ClickableArea } from '../types';

export interface SendResult {
  success: boolean;
  data?: {
    custom_key: string;
    platform: string;
    total_channels: number;
    sent: number;
    failed: number;
    sent_at: string;
    results: Array<{
      customer_id: string;
      custom_key: string;
      channel_id: string;
      channel_name: string;
      channel_type: string;
      status: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface SendOptions {
  groupId?: string;
  channelId?: string;
}

export class OutboundService {
  constructor(private env: Env) {}

  private async send(
    customKey: string,
    message: Record<string, unknown>,
    options?: SendOptions
  ): Promise<SendResult> {
    const payload: Record<string, unknown> = {
      key_name: 'username',
      key_value: customKey,
      platform: 'line',
      callback_url: this.env.OUTBOUND_CALLBACK_URL,
      message,
    };

    // Add optional group_id or channel_id
    if (options?.groupId) {
      payload.group_id = options.groupId;
    }
    if (options?.channelId) {
      payload.channel_id = options.channelId;
    }

    try {
      const response = await fetch(`${this.env.OUTBOUND_API_URL}/outbound/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.OUTBOUND_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: (errorData as Record<string, string>).message || response.statusText,
          },
        };
      }

      return await response.json() as SendResult;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async sendText(customKey: string, text: string, options?: SendOptions): Promise<SendResult> {
    return this.send(customKey, { type: 'text', text }, options);
  }

  async sendFlex(
    customKey: string,
    contents: object,
    altText: string,
    options?: SendOptions
  ): Promise<SendResult> {
    return this.send(customKey, { type: 'flex', altText, contents }, options);
  }

  async sendImage(
    customKey: string,
    originalContentUrl: string,
    previewImageUrl?: string,
    options?: SendOptions
  ): Promise<SendResult> {
    return this.send(
      customKey,
      {
        type: 'image',
        originalContentUrl,
        previewImageUrl: previewImageUrl || originalContentUrl,
      },
      options
    );
  }

  async sendMessages(
    customKey: string,
    messages: Array<Record<string, unknown>>,
    options?: SendOptions
  ): Promise<SendResult> {
    // LINE allows up to 5 messages at once
    // For now, send them one by one and return combined result
    let lastResult: SendResult = { success: false };
    for (const message of messages.slice(0, 5)) {
      lastResult = await this.send(customKey, message, options);
      if (!lastResult.success) {
        return lastResult;
      }
    }
    return lastResult;
  }

  // Create Game Flex with clickable overlay
  createGameFlexWithOverlay(
    imageUrl: string,
    width: number,
    height: number,
    clickableAreas: ClickableArea[],
    gameId?: string
  ): object {
    const overlayBoxes = clickableAreas.map((area) => {
      const leftPercent = (area.x / width) * 100;
      const topPercent = (area.y / height) * 100;
      const widthPercent = (area.width / width) * 100;
      const heightPercent = (area.height / height) * 100;

      return {
        type: 'box',
        layout: 'vertical',
        contents: [],
        position: 'absolute',
        offsetStart: `${leftPercent}%`,
        offsetTop: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        action: {
          type: 'postback',
          data: `action=answer&position=${area.position}${gameId ? `&gameId=${gameId}` : ''}`,
        },
      };
    });

    return {
      type: 'bubble',
      size: 'giga',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: imageUrl,
            size: 'full',
            aspectMode: 'cover',
            aspectRatio: `${width}:${height}`,
          },
          {
            type: 'box',
            layout: 'vertical',
            position: 'absolute',
            offsetTop: '0px',
            offsetBottom: '0px',
            offsetStart: '0px',
            offsetEnd: '0px',
            contents: overlayBoxes,
          },
        ],
        paddingAll: '0px',
      },
    };
  }

  // Create Game Result Flex
  createGameResultFlex(isWin: boolean, message: string): object {
    return {
      type: 'bubble',
      size: 'compact',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: isWin ? '🎉' : '😢',
            size: '3xl',
            align: 'center',
          },
          {
            type: 'text',
            text: isWin ? 'ยินดีด้วย!' : 'เสียใจด้วย',
            weight: 'bold',
            size: 'xl',
            align: 'center',
            margin: 'md',
            color: isWin ? '#4ECDC4' : '#FF6B6B',
          },
          {
            type: 'text',
            text: message,
            size: 'sm',
            align: 'center',
            margin: 'sm',
            color: '#666666',
            wrap: true,
          },
        ],
      },
    };
  }

  // Send win callback
  async sendWinCallback(
    callbackUrl: string,
    data: {
      customKey: string;
      gameId: string;
      gameName: string;
      answeredAt: Date;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
