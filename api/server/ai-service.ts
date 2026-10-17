import { GoogleGenAI } from '@google/genai';
import type { MenuItem, Vendor } from '../types';

type AiDeps = {
  apiKey?: string;
  getVendors: () => Promise<Vendor[]>;
  getProducts: () => Promise<MenuItem[]>;
};

export class AiService {
  private ai?: GoogleGenAI;

  constructor(private deps: AiDeps) {
    if (deps.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: deps.apiKey });
    }
  }

  private async getVendorContext(): Promise<string> {
    const vendors = await this.deps.getVendors();
    return JSON.stringify(
      vendors.map((vendor) => ({
        name: vendor.name,
        category: vendor.category,
        location: vendor.location,
        rating: vendor.rating,
        description: vendor.description,
      }))
    );
  }

  private async getProductContext(): Promise<string> {
    const products = await this.deps.getProducts();
    return JSON.stringify(
      products.map((product) => ({
        name: product.name,
        price: product.price,
        category: product.category,
        vendorId: product.vendorId,
        desc: product.description,
      }))
    );
  }

  async getBeachRecommendation(query: string): Promise<string> {
    if (!this.ai) return '';

    const [vendorContext, productContext] = await Promise.all([
      this.getVendorContext(),
      this.getProductContext(),
    ]);

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: `You are the "TanTan" beach food guide. Respond in short, mobile-friendly Simplified Chinese with a warm Hainan-local tone. Prefer recommending items from the vendor/product data. If the user asks about weather or nearby services (surfing, transport), use the search tool.\n\nVendors: ${vendorContext}\nProducts: ${productContext}`,
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text;
  }

  async generateDailyBreeze(): Promise<string> {
    if (!this.ai) return '';

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Write a short, playful daily beach tip in Simplified Chinese (under 10 characters).',
      config: {
        systemInstruction: 'You are a local Hainan beach stall owner. Keep it witty and friendly.',
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text;
  }
}
