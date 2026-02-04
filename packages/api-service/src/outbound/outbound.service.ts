import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface OutboundMessage {
  type: 'text' | 'image' | 'flex' | 'imagemap';
  text?: string;
  url?: string;
  caption?: string;
  altText?: string;
  contents?: object;
  baseUrl?: string;
  baseSize?: { width: number; height: number };
  actions?: object[];
}

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

@Injectable()
export class OutboundService {
  private readonly logger = new Logger(OutboundService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly callbackUrl: string;
  private readonly platform = 'line';

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'OUTBOUND_API_URL',
      'http://chatapi.dmkbet.in',
    );
    this.apiToken = this.configService.get<string>('OUTBOUND_API_TOKEN', '');
    this.callbackUrl = this.configService.get<string>(
      'OUTBOUND_CALLBACK_URL',
      'https://webhook.site/6bd0b453-7a96-43f5-98a2-0ef9f08caf21',
    );
  }

  private async send(
    customKey: string,
    message: OutboundMessage,
  ): Promise<SendResult> {
    const payload = {
      key_name: 'username',
      key_value: customKey,
      platform: this.platform,
      callback_url: this.callbackUrl,
      message,
    };

    this.logger.debug(`Sending payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      const response = await axios.post(
        `${this.apiUrl}/outbound/send`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Message sent to ${customKey}: ${message.type}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${customKey}: ${error.message}`,
      );

      // Return error details from API response
      if (error.response?.data) {
        return {
          success: false,
          error: {
            code: error.response.data.statusCode?.toString() || 'SEND_FAILED',
            message: error.response.data.message || error.message,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error.message,
        },
      };
    }
  }

  async sendText(customKey: string, text: string): Promise<SendResult> {
    return this.send(customKey, {
      type: 'text',
      text,
    });
  }

  async sendImage(
    customKey: string,
    url: string,
    caption?: string,
  ): Promise<SendResult> {
    return this.send(customKey, {
      type: 'image',
      url,
      caption,
    });
  }

  async sendFlex(
    customKey: string,
    contents: object,
    altText: string,
  ): Promise<SendResult> {
    return this.send(customKey, {
      type: 'flex',
      altText,
      contents,
    });
  }

  async sendImagemap(
    customKey: string,
    imagemapContent: {
      baseUrl: string;
      baseSize: { width: number; height: number };
      actions: object[];
    },
    altText: string,
  ): Promise<SendResult> {
    return this.send(customKey, {
      type: 'imagemap',
      baseUrl: imagemapContent.baseUrl,
      altText,
      baseSize: imagemapContent.baseSize,
      actions: imagemapContent.actions,
    });
  }

  // ============ Flex Message Builders ============

  // Create Game Flex Message with grid layout (rows x cols)
  createGameFlex(
    imageUrl: string,
    gameName: string,
    rows = 1,
    cols = 3,
    gameId?: string,
  ): object {
    const totalCells = rows * cols;
    
    // Create button rows
    const buttonRows: object[] = [];
    let position = 1;
    
    for (let row = 0; row < rows; row++) {
      const rowButtons: object[] = [];
      for (let col = 0; col < cols; col++) {
        rowButtons.push({
          type: 'button',
          style: 'primary',
          color: '#4ECDC4',
          height: 'sm',
          action: {
            type: 'postback',
            label: `${position}`,
            data: `action=answer&position=${position}${gameId ? `&gameId=${gameId}` : ''}`,
          },
          flex: 1,
        });
        position++;
      }
      buttonRows.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: rowButtons,
      });
    }

    return {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: gameName,
            weight: 'bold',
            size: 'lg',
            align: 'center',
          },
          {
            type: 'text',
            text: `กดเลือกช่องที่คิดว่าผิด (1-${totalCells})`,
            size: 'sm',
            color: '#666666',
            align: 'center',
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: buttonRows,
      },
    };
  }

  // Create Game Imagemap with grid layout (rows x cols) - Legacy
  createGameImagemap(
    imageUrl: string,
    width: number,
    height: number,
    rows = 1,
    cols = 3,
    gameId?: string,
  ): {
    baseUrl: string;
    baseSize: { width: number; height: number };
    actions: object[];
  } {
    const cellWidth = Math.floor(width / cols);
    const cellHeight = Math.floor(height / rows);

    const actions: Array<{
      type: string;
      data: string;
      area: { x: number; y: number; width: number; height: number };
    }> = [];

    let position = 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        actions.push({
          type: 'postback',
          data: `action=answer&position=${position}${gameId ? `&gameId=${gameId}` : ''}`,
          area: {
            x: col * cellWidth,
            y: row * cellHeight,
            width: cellWidth,
            height: cellHeight,
          },
        });
        position++;
      }
    }

    return {
      baseUrl: imageUrl,
      baseSize: {
        width,
        height,
      },
      actions,
    };
  }

  // Create Game Flex with clickable overlay (supports postback on image)
  createGameFlexWithOverlay(
    imageUrl: string,
    width: number,
    height: number,
    clickableAreas: Array<{ position: number; x: number; y: number; width: number; height: number }>,
    gameId?: string,
  ): object {
    // Calculate percentage positions for absolute overlay
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

  // Create Game Imagemap from template clickable areas (legacy - no postback support)
  createGameImagemapFromTemplate(
    imageUrl: string,
    width: number,
    height: number,
    clickableAreas: Array<{ position: number; x: number; y: number; width: number; height: number }>,
    gameId?: string,
  ): {
    baseUrl: string;
    baseSize: { width: number; height: number };
    actions: object[];
  } {
    // LINE Imagemap supports only 'uri' and 'message' actions (not postback)
    const actions = clickableAreas.map((area) => ({
      type: 'message',
      text: `${area.position}`,
      area: {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
      },
    }));

    return {
      baseUrl: imageUrl,
      baseSize: { width, height },
      actions,
    };
  }

  // Create Game Flex Message from template clickable areas
  createGameFlexFromTemplate(
    imageUrl: string,
    gameName: string,
    clickableAreas: Array<{ position: number; x: number; y: number; width: number; height: number }>,
    gameId?: string,
  ): object {
    const totalAreas = clickableAreas.length;
    
    // Create buttons for each clickable area
    const buttons = clickableAreas.map((area) => ({
      type: 'button',
      style: 'primary',
      color: '#4ECDC4',
      height: 'sm',
      action: {
        type: 'postback',
        label: `${area.position}`,
        data: `action=answer&position=${area.position}${gameId ? `&gameId=${gameId}` : ''}`,
      },
      flex: 1,
    }));

    // Arrange buttons in rows (max 4 per row)
    const buttonRows: object[] = [];
    for (let i = 0; i < buttons.length; i += 4) {
      buttonRows.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: buttons.slice(i, i + 4),
      });
    }

    return {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: gameName,
            weight: 'bold',
            size: 'lg',
            align: 'center',
          },
          {
            type: 'text',
            text: `กดเลือกช่องที่คิดว่าผิด (1-${totalAreas})`,
            size: 'sm',
            color: '#666666',
            align: 'center',
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: buttonRows,
      },
    };
  }

  // Send win callback to external service (e.g., RDM)
  async sendWinCallback(
    callbackUrl: string,
    data: {
      customKey: string;
      gameId: string;
      gameName: string;
      answeredAt: Date;
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(callbackUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      this.logger.log(`Win callback sent to ${callbackUrl} for ${data.customKey}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send win callback to ${callbackUrl}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create Game Result Flex (Win/Lose)
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
}
