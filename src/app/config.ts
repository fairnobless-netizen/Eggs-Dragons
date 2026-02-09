
// ... (imports)

export enum GameState {
  BOOT = 'BOOT',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  STAGE_CLEARED = 'STAGE_CLEARED'
}

export const DEBUG_MODE = true;
export const DEBUG_LOG = (msg: string, data?: any) => {
  if (DEBUG_MODE) console.log(`[GAME_DEBUG] ${msg}`, data || '');
};

export const API_CONFIG = {
  USE_MOCK: true
};

export const TELEGRAM_DEEP_LINK_BASE = 'https://t.me/DragonEggGameBot/app?startapp=';

export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  INITIAL_LIVES: 6, // Updated to 6 per requirement
  MAX_LIVES: 7, // Kept for legacy ref
  MAX_LIVES_SINGLE: 7,
  MAX_LIVES_MULTIPLAYER: 10,
  BASE_SPEED: 0.0005,
  LEVEL_SCORE_TARGET: 1000,
  TIME_RAMP_INTERVAL: 10000,
  TIME_RAMP_MULT: 1.10,
  LEVEL_SPEED_STEP: 1.05,
  LANES: 4,
  STARTING_STARS: 500,
  DAILY_REWARD: 100,
  HARD_MULTIPLIER: 1.5,
  MODE_A: {
    SPAWN_INTERVAL_START: 1200,
    SPAWN_INTERVAL_MIN: 600,
    SPEED_DURATION_START: 2000,
    SPEED_DURATION_MIN: 1000
  },
  MODE_B: {
    SPAWN_INTERVAL_START: 1000,
    SPAWN_INTERVAL_MIN: 400,
    SPEED_DURATION_START: 1800,
    SPEED_DURATION_MIN: 800
  },
  BOOSTS: {
    FREEZE: { DURATION: 10000 },
    MAGNET: { DURATION: 10000 },
    SHIELD: { DURATION: 10000 },
  }
};

export const TAIL_COLORS = [
  0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6,
  0xec4899, 0x06b6d4, 0xf97316, 0x6366f1, 0x22c55e
];

export interface LevelConfig {
  bgColor: number;
  rampColor: number;
  assetUrl?: string;
  ambientFx?: string;
}

export const LEVEL_DATA: LevelConfig[] = [
  { bgColor: 0x000000, rampColor: 0x334155 },
  { bgColor: 0x1e293b, rampColor: 0x475569 },
  { bgColor: 0x2d1b0d, rampColor: 0x5c4033 },
  { bgColor: 0x064e3b, rampColor: 0x065f46 },
  { bgColor: 0x4c1d95, rampColor: 0x5b21b6 },
  { bgColor: 0x701a75, rampColor: 0x86198f },
  { bgColor: 0x111827, rampColor: 0x374151 },
  { bgColor: 0x450a0a, rampColor: 0x7f1d1d },
  { bgColor: 0x0f172a, rampColor: 0x1e293b },
  { bgColor: 0x14532d, rampColor: 0x166534 },
  { bgColor: 0x164e63, rampColor: 0x155e75 },
  { bgColor: 0x312e81, rampColor: 0x3730a3 },
  { bgColor: 0x1e1b4b, rampColor: 0x312e81 },
  { bgColor: 0x3f6212, rampColor: 0x4d7c0f },
  { bgColor: 0x831843, rampColor: 0x9d174d },
  { bgColor: 0x020617, rampColor: 0x0f172a },
  { bgColor: 0x171717, rampColor: 0x262626 },
  { bgColor: 0x18181b, rampColor: 0x27272a },
  { bgColor: 0x0c0a09, rampColor: 0x1c1917 },
  { bgColor: 0x111827, rampColor: 0xffffff },
];

export const ASSETS = {
  IMAGES: {
    DRAGON: 'dragon',
    LANE: 'lane',

    // Eggs / items (texture keys)
    EGG_WHITE: 'egg_white',
    EGG_BLUE: 'egg_blue',        // ✅ ДОБАВИЛИ
    EGG_MITHRIL: 'egg_mithril',  // (у тебя это green)
    EGG_GOLDEN: 'egg_gold',
    EGG_BOMB: 'egg_bomb',
    EGG_SCALE: 'egg_scale',

    // optional items (если реально используешь)
    EGG_DIAMOND: 'egg_diamond',
    EGG_STAR: 'egg_star',

    BG: 'background',
  }
} as const;

export const EGG_TYPES = {
  WHITE: {
    asset: ASSETS.IMAGES.EGG_WHITE,
    chance: 0.45,
    score: 10,
    isMissable: true,
    radius: 14,
  },

  BLUE: {
    asset: ASSETS.IMAGES.EGG_BLUE,
    chance: 0.15,
    score: 15,
    isMissable: true,
    radius: 14,
  },

  MITHRIL: { // green
    asset: ASSETS.IMAGES.EGG_MITHRIL,
    chance: 0.20,
    score: 20,
    isMissable: true,
    radius: 14,
  },

  GOLDEN: {
    asset: ASSETS.IMAGES.EGG_GOLDEN,
    chance: 0.10,
    score: 30,
    isMissable: true,
    radius: 14,
  },

  BOMB: {
  asset: ASSETS.IMAGES.EGG_BOMB,
  chance: 0.10,
  score: 0,          // ✅ важно для TS/PlayScene
  penalty: -1,
  isMissable: false,
  radius: 12,
},


  SCALE: {
  asset: ASSETS.IMAGES.EGG_SCALE,
  chance: 0.05,
  score: 0,          // ✅ важно для TS/PlayScene
  scale: 1,
  isMissable: false,
  radius: 12,
},


  // ⚠️ оставляй ТОЛЬКО если реально используешь в геймплее
  DIAMOND: {
  asset: ASSETS.IMAGES.EGG_DIAMOND,
  chance: 0.03,
  score: 0,          // ✅ важно для TS/PlayScene
  token: 1,
  isMissable: false,
  radius: 15,
},


  STAR: {
  asset: ASSETS.IMAGES.EGG_STAR,
  chance: 0.02,
  score: 0,          // ✅ важно для TS/PlayScene
  star: 1,
  isMissable: false,
  radius: 15,
},
} as const;

export const STORE_PRICES = {
  // Phase 1: Diamond Eggs sold for Telegram Stars (XTR)
  DIAMOND_PACKS: [
    { id: 'eggs_500', amount: 500, costXtr: 60, productId: 'eggs_500' },
    { id: 'eggs_2000', amount: 2000, costXtr: 150, productId: 'eggs_2000' },
    { id: 'eggs_5000', amount: 5000, costXtr: 250, productId: 'eggs_5000' },
  ],
  // Items cost "Diamond Eggs" (internally profile.stars)
  ITEMS: {
    freeze: 100,
    shield: 150,
    magnet: 200,
    refill_hearts: 50,
  },
  SKINS: {
    TAIL: [20, 100, 200],
    WINGS: [20, 100, 200],
    LEGS: [50, 200],
    IRON_BODY: 100,
    CRYSTAL_BODY: 200
  }
};

export enum RampPos {
  LEFT_TOP = 0, LEFT_BOT = 1, RIGHT_TOP = 2, RIGHT_BOT = 3
}

export const RampIndex = RampPos;
export type RampIndex = RampPos;

export type BoostType = 'freeze' | 'magnet' | 'shield' | 'refill_hearts';
