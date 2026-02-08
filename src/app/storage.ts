


const KEY_BEST_SCORE = 'dragon_egg_best_score';
const KEY_DEVICE_ID = 'dragon_egg_device_id';
const KEY_LAYOUT = 'dragon_egg_layout_v2'; // Bumped version to reset defaults for new buttons
const KEY_PROFILE = 'player_profile_v6'; // Bumped for isOnboarded

// SECURITY NOTE: Simple salt for checksums. Rotated manually if needed.
const SEC_SALT = "gdx_secure_v1_";

export type LanguageCode = "ru" | "en" | "de" | "ar" | "uk" | "pl";

export interface SkinProfile {
  tailTier: number;
  wingsTier: number;
  legsTier: number;
  ironBodyOwned: boolean;
  crystalBodyOwned: boolean;
}

export interface PlayerProfile {
  userId: string;
  username: string;
  isOnboarded: boolean;
  language: LanguageCode;
  stars: number;
  scales: number; 
  skins: SkinProfile; 
  inventory: {
    freeze: number;
    shield: number;
    magnet: number;
    refill_hearts: number;
  };
  referralApplied: boolean;
  referredBy: string | null;
  updatedAt: number;
  // MP: Social features
  friends: { id: string; username: string }[]; // MP: Changed from string[] to object array
  friendRequests: {
    incoming: { id: string; username: string }[];
    outgoing: { id: string; username: string }[];
  };
}

export type ControlId = "move_ul" | "move_ur" | "move_bl" | "move_br" | "power_freeze" | "power_shield" | "power_magnet" | "power_refill" | "pause" | "settings" | "multiplayer";
export type ControlLayout = Record<ControlId, { x: number; y: number }>;

export const DEFAULT_LAYOUT: ControlLayout = {
  // Corners
  move_ul: { x: 0.04, y: 0.20 },
  move_ur: { x: 0.96, y: 0.20 },
  move_bl: { x: 0.04, y: 0.80 },
  move_br: { x: 0.96, y: 0.80 },
  
  // Bottom Bar Cluster (Centered)
  // Approx Y=0.92 for bottom edge placement
  multiplayer: { x: 0.22, y: 0.92 },
  settings: { x: 0.30, y: 0.92 },
  power_freeze: { x: 0.38, y: 0.92 },
  power_shield: { x: 0.46, y: 0.92 },
  power_magnet: { x: 0.54, y: 0.92 },
  power_refill: { x: 0.62, y: 0.92 },
  pause: { x: 0.70, y: 0.92 },
};

// Tightly packed bottom row for mobile (approx 0.065 spacing)
export const MOBILE_DEFAULT_LAYOUT: ControlLayout = {
  // Corners (Adjusted for visual pinning with center-based positioning)
  // Approx 9% X and 18% Y places 80px buttons roughly near 28px inset on 800x400 screens
  move_ul: { x: 0.09, y: 0.18 },
  move_ur: { x: 0.91, y: 0.18 },
  move_bl: { x: 0.09, y: 0.82 },
  move_br: { x: 0.91, y: 0.82 },

  // Bottom Bar Cluster (Tightly packed)
  multiplayer: { x: 0.2725, y: 0.92 },
  settings: { x: 0.3375, y: 0.92 },
  power_freeze: { x: 0.4025, y: 0.92 },
  power_shield: { x: 0.4675, y: 0.92 },
  power_magnet: { x: 0.5325, y: 0.92 },
  power_refill: { x: 0.5975, y: 0.92 },
  pause: { x: 0.6625, y: 0.92 },
};

// SECURITY NOTE: Basic hash to prevent trivial JSON edits in DevTools.
// For robust protection, critical state (stars/purchases) must move to server.
const generateHash = (data: any): string => {
  const str = JSON.stringify(data) + SEC_SALT;
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return ((h ^ h >>> 16) >>> 0).toString(16);
};

export const StorageService = {
  getDeviceId(): string {
    let id = localStorage.getItem(KEY_DEVICE_ID);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem(KEY_DEVICE_ID, id);
    }
    return id;
  },

  generateStableUserId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  getProfile(): PlayerProfile {
    try {
      const saved = localStorage.getItem(KEY_PROFILE);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // SECURITY NOTE: Validate data integrity. 
        // If 'h' exists, verify. If not, assume legacy data and migrate.
        if (parsed.d && parsed.h) {
           const calcHash = generateHash(parsed.d);
           if (calcHash !== parsed.h) {
             console.warn("Storage tamper detected or corruption. Resetting profile.");
             // Fallthrough to default profile generation logic
           } else {
             // MP: Migration for existing profiles
             const p = parsed.d;
             
             // MP: Migration - Convert string[] friends to object[]
             if (p.friends && p.friends.length > 0 && typeof p.friends[0] === 'string') {
                 p.friends = p.friends.map((id: string) => ({ id, username: "Unknown" }));
             } else if (!p.friends) {
                 p.friends = [];
             }
             
             if (!p.friendRequests) p.friendRequests = { incoming: [], outgoing: [] };
             return p;
           }
        } else if (parsed.userId) {
             // Legacy format (Migration)
             if (!parsed.inventory) parsed.inventory = { freeze: 0, shield: 0, magnet: 0, refill_hearts: 0 };
             if (typeof parsed.inventory.refill_hearts === 'undefined') parsed.inventory.refill_hearts = 0;
             if (typeof parsed.isOnboarded === 'undefined') parsed.isOnboarded = false;
             // MP: Init social fields
             if (!parsed.friends) parsed.friends = [];
             if (!parsed.friendRequests) parsed.friendRequests = { incoming: [], outgoing: [] };
             return parsed;
        }
      }
    } catch (e) {
      console.error("Profile load error", e);
    }

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    // Default username is generic until onboarded
    const defaultProfile: PlayerProfile = {
      userId: this.generateStableUserId(),
      username: tgUser?.username || tgUser?.first_name || "Player",
      isOnboarded: false,
      language: "en",
      stars: 1000,
      scales: 1000,
      skins: {
        tailTier: 0,
        wingsTier: 0,
        legsTier: 0,
        ironBodyOwned: false,
        crystalBodyOwned: false
      },
      inventory: {
        freeze: 5,
        shield: 3,
        magnet: 3,
        refill_hearts: 0
      },
      referralApplied: false,
      referredBy: null,
      updatedAt: Date.now(),
      // MP: Default social
      friends: [],
      friendRequests: { incoming: [], outgoing: [] }
    };

    if (refCode && refCode !== defaultProfile.userId) {
      defaultProfile.scales += 20;
      defaultProfile.referralApplied = true;
      defaultProfile.referredBy = refCode;
      console.log(`[REFERRAL] New user joined via ref: ${refCode}. Rewarding new user +20 scales.`);
    }

    this.saveProfile(defaultProfile);
    return defaultProfile;
  },

  saveProfile(profile: PlayerProfile): void {
    try {
      profile.updatedAt = Date.now();
      // SECURITY NOTE: Saving with hash wrapper.
      const payload = {
        d: profile,
        h: generateHash(profile)
      };
      localStorage.setItem(KEY_PROFILE, JSON.stringify(payload));
    } catch (e) {
      console.error("Profile save error", e);
    }
  },

  updateProfile(partial: Partial<PlayerProfile>): PlayerProfile {
    const current = this.getProfile();
    const updated = { ...current, ...partial };
    this.saveProfile(updated);
    return updated;
  },

  addStars(amount: number): number {
    const profile = this.getProfile();
    profile.stars += amount;
    this.saveProfile(profile);
    return profile.stars;
  },

  addScales(amount: number): number {
    const profile = this.getProfile();
    profile.scales += amount;
    this.saveProfile(profile);
    return profile.scales;
  },

  useBoost(type: 'freeze' | 'shield' | 'magnet' | 'refill_hearts'): boolean {
    const profile = this.getProfile();
    if (profile.inventory[type] > 0) {
      profile.inventory[type]--;
      this.saveProfile(profile);
      return true;
    }
    return false;
  },

  getBestScore(): number {
    try {
      const val = localStorage.getItem(KEY_BEST_SCORE);
      return val ? parseInt(val, 10) : 0;
    } catch (e) {
      return 0;
    }
  },

  setBestScore(score: number): void {
    try {
      const current = this.getBestScore();
      if (score > current) {
        localStorage.setItem(KEY_BEST_SCORE, score.toString());
      }
    } catch (e) {
      console.error('Storage error', e);
    }
  },

  getLayout(): ControlLayout {
    try {
      const saved = localStorage.getItem(KEY_LAYOUT + "_" + this.getDeviceId());
      if (saved) {
        const layout = JSON.parse(saved);
        return { ...DEFAULT_LAYOUT, ...layout };
      }
      
      // Default Logic: Check for mobile landscape to serve optimized layout
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 900 && window.innerHeight < 500;
      return isMobile ? MOBILE_DEFAULT_LAYOUT : DEFAULT_LAYOUT;
    } catch (e) {
      return DEFAULT_LAYOUT;
    }
  },

  setLayout(layout: ControlLayout): void {
    try {
      localStorage.setItem(KEY_LAYOUT + "_" + this.getDeviceId(), JSON.stringify(layout));
    } catch (e) {
      console.error('Layout storage error', e);
    }
  }
};
