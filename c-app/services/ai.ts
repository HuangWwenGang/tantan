import { request } from './api';

export class AIService {
  async getBeachRecommendation(query: string): Promise<string> {
    const payload = await request<{ reply?: string }>('/api/ai/recommendation', {
      method: 'POST',
      body: { query },
    });
    return payload.reply || '';
  }

  async generateDailyBreeze(): Promise<string> {
    const payload = await request<{ tip?: string }>('/api/ai/daily-breeze');
    return payload.tip || '';
  }
}

export const aiService = new AIService();
