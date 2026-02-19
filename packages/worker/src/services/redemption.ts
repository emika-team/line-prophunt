import type { Env } from '../types';

export interface MissionTag {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export class RedemptionService {
  private apiUrl: string;
  private apiKey: string;

  constructor(env: Env) {
    this.apiUrl = env.REDEMPTION_API_URL || 'https://redemption-api.bethub.link';
    this.apiKey = env.REDEMPTION_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async getMissionTags(): Promise<{ success: boolean; tags?: MissionTag[]; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'API not configured' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/admins/mission-tags/v2/get-list`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
        },
      });

      const data = await response.json() as { result?: { mission_tags?: MissionTag[] } };

      if (!response.ok) {
        return { success: false, error: JSON.stringify(data) };
      }

      return { success: true, tags: data.result?.mission_tags || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async linkUserToTag(username: string, tagId: number): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      console.log('[Redemption] API not configured, skipping');
      return { success: false, error: 'API not configured' };
    }

    try {
      console.log(`[Redemption] Linking user ${username} to tag ${tagId}`);

      const response = await fetch(`${this.apiUrl}/admins/mission-tags/user/create`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          mission_tag_id: tagId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`[Redemption] API error:`, data);
        return { success: false, error: JSON.stringify(data) };
      }

      console.log(`[Redemption] Success:`, data);
      return { success: true };
    } catch (error) {
      console.error(`[Redemption] Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
