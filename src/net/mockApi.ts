
import { LeaderboardEntry, ProfileResponse, ScoreResponse, PublicProfile, LeaderboardType, PurchaseRecord } from './types';
import { StorageService } from '../app/storage';
import { GAME_CONFIG, STORE_PRICES } from '../app/config';
import { ReceiptGenerator } from '../utils/receiptGenerator';

const MOCK_DELAY = 300;

// Simulation of a persistent server database
interface UserData {
  highScore: number;
  stars: number;
  purchases: string[]; // List of productIds owned (legacy)
  purchaseHistory: PurchaseRecord[]; // Full history
  purchaseCount: number; // Sequential counter for order IDs
  lastClaim?: number;
  displayName: string;
}

// Separate stores for different leaderboards
const usersDb: Map<string, UserData> = new Map();
const duoDb: Map<string, number> = new Map(); // Key: "Name + Name", Val: Score
const botDb: Map<string, number> = new Map(); // Key: "Name", Val: Score

const getOrCreateUser = (id: string, defaultName: string): UserData => {
  if (!usersDb.has(id)) {
    usersDb.set(id, {
      highScore: 0,
      stars: GAME_CONFIG.STARTING_STARS,
      purchases: [],
      purchaseHistory: [],
      purchaseCount: 0,
      displayName: defaultName,
    });
  }
  return usersDb.get(id)!;
};

export const MockApi = {
  async submitScore(score: number, telegramId?: number, username?: string, type: LeaderboardType = 'solo', partnerName?: string): Promise<ScoreResponse> {
    const deviceId = StorageService.getDeviceId();
    const userId = telegramId ? telegramId.toString() : deviceId;
    const displayName = username || "You";

    if (type === 'solo') {
        const user = getOrCreateUser(userId, displayName);
        if (username) user.displayName = username;

        if (telegramId && usersDb.has(deviceId)) {
            // Merge logic
            const guest = usersDb.get(deviceId)!;
            user.highScore = Math.max(user.highScore, guest.highScore);
            user.stars += (guest.stars - GAME_CONFIG.STARTING_STARS); 
            user.purchases = Array.from(new Set([...user.purchases, ...guest.purchases]));
            usersDb.delete(deviceId);
        }

        if (score > user.highScore) {
            user.highScore = score;
            StorageService.setBestScore(score);
        }
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ success: true, highScore: user.highScore, newRank: Math.floor(Math.random() * 100) + 1 });
            }, MOCK_DELAY);
        });
    } else if (type === 'duo' && partnerName) {
        // Duo Submission
        const key = `${displayName} + ${partnerName}`;
        const current = duoDb.get(key) || 0;
        if (score > current) duoDb.set(key, score);
        return Promise.resolve({ success: true, highScore: Math.max(score, current) });
    } else if (type === 'solo_bot') {
        // Bot Submission
        const key = displayName;
        const current = botDb.get(key) || 0;
        if (score > current) botDb.set(key, score);
        return Promise.resolve({ success: true, highScore: Math.max(score, current) });
    }
    
    return Promise.resolve({ success: false, highScore: 0 });
  },

  async getProfile(userId: number | string, displayName: string): Promise<ProfileResponse> {
    const id = userId.toString();
    const user = getOrCreateUser(id, displayName);
    user.highScore = Math.max(user.highScore, StorageService.getBestScore());

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          id: userId,
          displayName: user.displayName,
          totalGames: 1,
          bestScore: user.highScore,
          stars: user.stars,
          purchases: user.purchases,
          lastDailyClaim: user.lastClaim
        });
      }, MOCK_DELAY);
    });
  },
  
  async updateProfile(userId: string, displayName: string): Promise<boolean> {
      const user = getOrCreateUser(userId, displayName);
      user.displayName = displayName;
      return true;
  },
  
  async checkUsernameAvailability(username: string): Promise<boolean> {
      return new Promise(resolve => {
          setTimeout(() => {
              const lower = username.toLowerCase().trim();
              if (!lower || lower.length < 3) {
                  resolve(false); return;
              }
              for (const u of usersDb.values()) {
                  if (u.displayName.toLowerCase() === lower) {
                      resolve(false); return;
                  }
              }
              resolve(true);
          }, 400);
      });
  },
  
  async searchUsers(query: string): Promise<PublicProfile[]> {
    return new Promise(resolve => {
        setTimeout(() => {
            const results: PublicProfile[] = [];
            const lowerQ = query.toLowerCase();
            
            // Seed fake users if empty
            if (usersDb.size < 5) {
                 usersDb.set('u_1', { highScore: 1000, stars: 0, purchases: [], purchaseHistory: [], purchaseCount: 0, displayName: 'DragonSlayer' });
                 usersDb.set('u_2', { highScore: 2000, stars: 0, purchases: [], purchaseHistory: [], purchaseCount: 0, displayName: 'EggHunter' });
                 usersDb.set('u_3', { highScore: 500, stars: 0, purchases: [], purchaseHistory: [], purchaseCount: 0, displayName: 'SarahConnor' });
                 usersDb.set('u_4', { highScore: 8000, stars: 0, purchases: [], purchaseHistory: [], purchaseCount: 0, displayName: 'Khaleesi' });
                 usersDb.set('u_5', { highScore: 3500, stars: 0, purchases: [], purchaseHistory: [], purchaseCount: 0, displayName: 'Spyro' });
            }

            for (const [id, u] of usersDb.entries()) {
                if (u.displayName.toLowerCase().includes(lowerQ)) {
                    results.push({ id, username: u.displayName });
                }
            }
            resolve(results.slice(0, 10));
        }, 300);
    });
  },

  async claimDaily(userId: number | string): Promise<{success: boolean, stars?: number, message: string}> {
    const id = userId.toString();
    const user = getOrCreateUser(id, "User");
    const now = new Date();
    if (user.lastClaim) {
      const last = new Date(user.lastClaim);
      if (now.getUTCFullYear() === last.getUTCFullYear() && now.getUTCMonth() === last.getUTCMonth() && now.getUTCDate() === last.getUTCDate()) {
        return { success: false, message: "Already claimed today!" };
      }
    }
    user.stars += GAME_CONFIG.DAILY_REWARD;
    user.lastClaim = now.getTime();
    return { success: true, stars: user.stars, message: "+100 Stars added!" };
  },

  async createPaymentIntent(userId: string, packId: string): Promise<{ paymentToken: string }> {
      // Simulate unique payload for duplicate checks
      const payload = `${userId}_${packId}_${Date.now()}`;
      return Promise.resolve({ paymentToken: payload });
  },

  /**
   * Simulates the Server-Side Payment Webhook.
   * Handles:
   * 1. Idempotency (check if payload processed)
   * 2. Order Number generation (User-scoped sequential)
   * 3. Record creation
   * 4. Receipt generation (PDF)
   */
  async submitPurchase(userId: string, type: 'boost' | 'skin' | 'exchange' | 'pack', itemId: string, cost: number): Promise<any> {
    const user = getOrCreateUser(userId, "Player");
    
    // Simulate webhook payload ID (in real app, this comes from Telegram update)
    // For demo 'pack' purchases, we treat them as needing a receipt.
    // Boost/Skin/Exchange are internal currency spends, no receipt needed usually, 
    // BUT user prompt implies "Digital purchases in Telegram" (XTR) need receipts.
    // In our config, only 'DIAMOND_PACKS' are XTR.
    
    const isXtrPurchase = STORE_PRICES.DIAMOND_PACKS.some(p => p.productId === itemId);

    if (isXtrPurchase) {
        // 1. Idempotency Check (Simulated)
        // In real world, we check DB if this payload was processed. 
        // Here we just proceed as 'createPaymentIntent' generates unique payloads.
        
        // 2. Increment Order Sequence
        user.purchaseCount++;
        const orderNum = `${userId}_${user.purchaseCount.toString().padStart(3, '0')}`;
        
        // Find Pack Details
        const pack = STORE_PRICES.DIAMOND_PACKS.find(p => p.productId === itemId);
        const title = pack ? `${pack.amount} Diamond Eggs` : itemId;
        
        // 3. Create Record
        const record: PurchaseRecord = {
            orderNumber: orderNum,
            telegramUserId: userId,
            payload: `txn_${Date.now()}`,
            productId: itemId,
            productTitle: title,
            amount: pack?.amount || 0,
            currency: 'XTR',
            price: cost,
            createdAt: new Date().toISOString()
        };
        
        user.purchaseHistory.push(record);
        
        // 4. Generate Receipt (Server-side simulation)
        // In production: const pdfBuffer = await ReceiptService.createPDF(record);
        //                await bot.telegram.sendDocument(userId, { source: pdfBuffer, filename: 'receipt.pdf' });
        
        console.log(`[BACKEND] Generating Receipt for Order ${orderNum}...`);
        const pdfUrl = ReceiptGenerator.generate(record);
        console.log(`[BACKEND] Receipt PDF generated:`, pdfUrl);
        
        // Demo Only: Open PDF in new tab to prove it exists
        // window.open(pdfUrl, '_blank'); 
        
        // Update user balance (Server authoritative)
        user.stars += (pack?.amount || 0);
        
        return Promise.resolve({ ok: true, pdfUrl, message: "Receipt sent to chat" });
    } else {
        // Internal currency spend
        return Promise.resolve({ ok: true });
    }
  },

  async getLeaderboard(type: LeaderboardType = 'solo'): Promise<LeaderboardEntry[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        const entries: LeaderboardEntry[] = [];

        if (type === 'solo') {
            entries.push({ rank: 1, name: "DracoKing", score: 9000 });
            entries.push({ rank: 2, name: "EggHunter", score: 8500 });
            for (const [id, u] of usersDb.entries()) {
                if (u.highScore > 0) entries.push({ rank: 0, name: u.displayName, score: u.highScore });
            }
        } else if (type === 'duo') {
            // Mock Duo Data
            entries.push({ rank: 1, name: "Draco + Slayer", score: 18000 });
            entries.push({ rank: 2, name: "Egg + Hunter", score: 15000 });
            for (const [name, score] of duoDb.entries()) {
                entries.push({ rank: 0, name: name, score: score });
            }
        } else if (type === 'solo_bot') {
            // Mock Bot Data
            entries.push({ rank: 1, name: "Master (vs Bot)", score: 12000 });
            for (const [name, score] of botDb.entries()) {
                entries.push({ rank: 0, name: `${name} + Bot`, score: score });
            }
        }
        
        // Sort and limit
        entries.sort((a,b) => b.score - a.score);
        const limited = entries.slice(0, 100);
        limited.forEach((e, i) => e.rank = i + 1);
        
        resolve(limited);
      }, MOCK_DELAY);
    });
  }
};
