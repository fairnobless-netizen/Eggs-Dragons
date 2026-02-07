
export interface ScoreRequest {
  device_id: string;
  telegram_id?: number;
  username?: string;
  score: number;
  leaderboardType?: LeaderboardType;
  partnerName?: string;
}

export interface ScoreResponse {
  success: boolean;
  highScore: number;
  newRank?: number;
  message?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

export interface ProfileResponse {
  id: number | string;
  displayName: string;
  totalGames: number;
  bestScore: number;
  stars: number;
  purchases: string[];
  lastDailyClaim?: number;
}

// MP: Public profile for search results
export interface PublicProfile {
  id: string;
  username: string;
  avatar?: string;
}

export type LeaderboardType = 'solo' | 'duo' | 'solo_bot';

export interface PurchaseRecord {
  orderNumber: string; // userId_001
  telegramUserId: string;
  payload: string; // Unique transaction ID
  productId: string;
  productTitle: string;
  amount: number; // e.g. 500 eggs
  currency: 'XTR';
  price: number; // Stars cost
  createdAt: string; // ISO Date
}
