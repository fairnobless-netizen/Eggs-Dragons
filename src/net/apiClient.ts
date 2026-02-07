
import { API_CONFIG } from '../app/config';
import { MockApi } from './mockApi';
import { LeaderboardEntry, ProfileResponse, ScoreResponse, PublicProfile, LeaderboardType } from './types';

// SECURITY NOTE: Simple in-memory rate limiter to mitigate bot spam.
const callHistory: Record<string, number> = {};

const checkRateLimit = (key: string, cooldownMs: number): boolean => {
  const now = Date.now();
  const last = callHistory[key] || 0;
  if (now - last < cooldownMs) {
    console.warn(`[SECURITY] Rate limit hit for ${key}. wait ${cooldownMs}ms`);
    return false;
  }
  callHistory[key] = now;
  return true;
};

// BACKEND-RELEVANT: Stubs for real implementation
const RealApi = {
  async submitScore(score: number, telegramId?: number, username?: string, type?: LeaderboardType, partnerName?: string): Promise<ScoreResponse> { throw new Error("Not implemented"); },
  async getLeaderboard(type: LeaderboardType): Promise<LeaderboardEntry[]> { throw new Error("Not implemented"); },
  async getProfile(userId: number | string, displayName: string): Promise<ProfileResponse> { throw new Error("Not implemented"); },
  async updateProfile(userId: string, displayName: string): Promise<boolean> { throw new Error("Not implemented"); },
  async checkUsernameAvailability(username: string): Promise<boolean> { throw new Error("Not implemented"); },
  async claimDaily(userId: number | string): Promise<any> { throw new Error("Not implemented"); },
  async searchUsers(query: string): Promise<PublicProfile[]> { throw new Error("Not implemented"); },
  
  async createPaymentIntent(userId: string, packId: string): Promise<{ paymentToken: string }> {
      return { paymentToken: "mock_token_123" };
  },

  async submitPurchase(userId: string, type: 'boost' | 'skin' | 'exchange', itemId: string, cost: number): Promise<any> {
      return { ok: true, newBalances: {}, newInventory: {} };
  }
};

const BaseApi = API_CONFIG.USE_MOCK ? MockApi : RealApi;

export const ApiClient = {
  ...BaseApi,

  async submitScore(score: number, telegramId?: number, username?: string, type: LeaderboardType = 'solo', partnerName?: string): Promise<ScoreResponse> {
    if (!checkRateLimit('submitScore', 3000)) {
        return { success: false, highScore: 0, message: "Rate limit exceeded" };
    }
    return BaseApi.submitScore(score, telegramId, username, type, partnerName);
  },

  async getLeaderboard(type: LeaderboardType = 'solo'): Promise<LeaderboardEntry[]> {
    return BaseApi.getLeaderboard(type);
  },

  async checkUsernameAvailability(username: string): Promise<boolean> {
    if (!checkRateLimit('checkUsername', 500)) return false;
    return BaseApi.checkUsernameAvailability(username);
  },

  async submitPurchase(userId: string, type: 'boost' | 'skin' | 'exchange', itemId: string, cost: number): Promise<any> {
    if (!checkRateLimit('purchase', 1000)) return { ok: false };
    return BaseApi.submitPurchase(userId, type, itemId, cost);
  },

  async searchUsers(query: string): Promise<PublicProfile[]> {
    if (!checkRateLimit('searchUsers', 300)) return [];
    return BaseApi.searchUsers(query);
  }
};
