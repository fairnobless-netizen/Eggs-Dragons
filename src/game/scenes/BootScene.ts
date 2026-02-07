
import Phaser from 'phaser';
import { ASSETS } from '../../app/config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // T1: Load Assets from public/game folder
    (this as any).load.path = '/game/';

    // Audio
    (this as any).load.audio('bg_music', ['audio/bg_ambient_loop.mp3', 'audio/bg_ambient_loop.ogg']);

    // Core
    (this as any).load.image(ASSETS.IMAGES.BG, 'bg/background.png');
    (this as any).load.image(ASSETS.IMAGES.DRAGON, 'dragon/dragon.png');
    (this as any).load.image(ASSETS.IMAGES.LANE, 'ui/lane.png');

    // Eggs
    (this as any).load.image(ASSETS.IMAGES.EGG_WHITE, 'eggs/egg_white.png');
    (this as any).load.image(ASSETS.IMAGES.EGG_MITHRIL, 'eggs/egg_mithril.png');
    (this as any).load.image(ASSETS.IMAGES.EGG_GOLDEN, 'eggs/egg_gold.png');
    (this as any).load.image(ASSETS.IMAGES.EGG_BOMB, 'eggs/egg_bomb.png');

    // Items
    (this as any).load.image(ASSETS.IMAGES.EGG_DIAMOND, 'items/diamond.png');
    (this as any).load.image(ASSETS.IMAGES.EGG_STAR, 'items/star.png');
    (this as any).load.image(ASSETS.IMAGES.EGG_SCALE, 'items/scale.png');

    // VFX
    (this as any).load.image('egg_splat', 'vfx/splat.png');
    
    // Fallback: If assets are missing, we generate them in create()
    // No dedicated fallback loading logic needed here as Phaser handles 404s gracefully
  }

  create() {
    this.createFallbackAssets();
    (this as any).scene.start('PlayScene');
  }

  createFallbackAssets() {
    // Helper for egg drawing
    const drawEgg = (g: Phaser.GameObjects.Graphics, color: number, shineColor: number, accentColor?: number) => {
      g.clear();
      // Drop Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(16, 20, 26, 22);

      // Egg Base (Darker side)
      const darkerColor = Phaser.Display.Color.IntegerToColor(color).darken(20).color;
      g.fillStyle(darkerColor, 1);
      g.fillEllipse(16, 16, 24, 30);

      // Egg Body (Main color)
      g.fillStyle(color, 1);
      g.fillEllipse(15, 15, 22, 28);

      // Internal Detail / Texture
      if (accentColor !== undefined) {
        g.fillStyle(accentColor, 0.5);
        g.fillEllipse(16, 18, 14, 18);
      }

      // Shine / Specular
      g.fillStyle(shineColor, 0.9);
      g.fillEllipse(10, 10, 8, 12);
      g.fillStyle(0xffffff, 0.4);
      g.fillEllipse(9, 8, 4, 6);
    };

    // Background placeholder
    if (!(this as any).textures.exists(ASSETS.IMAGES.BG)) {
      const bg = (this as any).make.graphics({ x: 0, y: 0, add: false });
      bg.fillStyle(0x0f172a, 1);
      bg.fillRect(0, 0, 800, 600);
      bg.generateTexture(ASSETS.IMAGES.BG, 800, 600);
    }

    if (!(this as any).textures.exists(ASSETS.IMAGES.DRAGON)) {
      const dragon = (this as any).make.graphics({ x: 0, y: 0, add: false });
      dragon.fillStyle(0x2c3327, 1);
      dragon.fillRect(0, 0, 40, 40);
      dragon.fillRect(30, 10, 15, 10);
      dragon.generateTexture(ASSETS.IMAGES.DRAGON, 50, 50);
    }

    if (!(this as any).textures.exists(ASSETS.IMAGES.LANE)) {
      const lane = (this as any).make.graphics({ x: 0, y: 0, add: false });
      lane.fillStyle(0x334155, 1);
      lane.fillRect(0, 5, 100, 12);
      lane.fillStyle(0x475569, 1);
      lane.fillRect(0, 5, 100, 3);
      lane.fillStyle(0x1e293b, 1);
      lane.fillRect(0, 14, 100, 3);
      lane.generateTexture(ASSETS.IMAGES.LANE, 100, 22);
    }

    // --- WHITE EGG ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_WHITE)) {
      const gWhite = (this as any).make.graphics({ x: 0, y: 0, add: false });
      drawEgg(gWhite, 0xf1f5f9, 0xffffff);
      gWhite.generateTexture(ASSETS.IMAGES.EGG_WHITE, 32, 32);
    }

    // --- MITHRIL EGG ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_MITHRIL)) {
      const gMithril = (this as any).make.graphics({ x: 0, y: 0, add: false });
      drawEgg(gMithril, 0x3bd66a, 0x86efac, 0x166534); // Greenish
      gMithril.generateTexture(ASSETS.IMAGES.EGG_MITHRIL, 32, 32);
    }

    // --- GOLDEN EGG ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_GOLDEN)) {
      const gGold = (this as any).make.graphics({ x: 0, y: 0, add: false });
      drawEgg(gGold, 0xfacc15, 0xfef08a, 0xeab308);
      gGold.fillStyle(0xffffff, 1);
      gGold.fillPoints([
          new Phaser.Geom.Point(16, 4),
          new Phaser.Geom.Point(18, 8),
          new Phaser.Geom.Point(14, 8)
      ]);
      gGold.generateTexture(ASSETS.IMAGES.EGG_GOLDEN, 32, 32);
    }

    // --- BOMB EGG ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_BOMB)) {
      const gBomb = (this as any).make.graphics({ x: 0, y: 0, add: false });
      gBomb.fillStyle(0x000000, 0.4);
      gBomb.fillEllipse(16, 20, 24, 18);
      gBomb.fillStyle(0x1e293b, 1);
      gBomb.fillCircle(16, 18, 14);
      gBomb.fillStyle(0x64748b, 0.8);
      gBomb.fillCircle(11, 13, 5);
      gBomb.fillStyle(0x334155, 1);
      gBomb.fillRect(14, 4, 4, 3);
      gBomb.lineStyle(2, 0x78350f, 1);
      gBomb.lineBetween(16, 4, 24, 2);
      gBomb.fillStyle(0xef4444, 1);
      gBomb.fillCircle(24, 2, 3);
      gBomb.fillStyle(0xfacc15, 0.8);
      gBomb.fillCircle(24, 2, 1.5);
      gBomb.generateTexture(ASSETS.IMAGES.EGG_BOMB, 32, 32);
    }

    // --- DIAMOND ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_DIAMOND)) {
      const gDiamond = (this as any).make.graphics({ x: 0, y: 0, add: false });
      gDiamond.fillStyle(0x000000, 0.2);
      gDiamond.fillEllipse(16, 24, 24, 12);
      gDiamond.fillStyle(0x22d3ee, 1);
      gDiamond.fillPoints([
          new Phaser.Geom.Point(16, 2),
          new Phaser.Geom.Point(28, 14),
          new Phaser.Geom.Point(16, 30),
          new Phaser.Geom.Point(4, 14)
      ]);
      gDiamond.fillStyle(0x67e8f9, 0.6);
      gDiamond.fillPoints([
          new Phaser.Geom.Point(16, 2),
          new Phaser.Geom.Point(22, 14),
          new Phaser.Geom.Point(16, 24),
          new Phaser.Geom.Point(10, 14)
      ]);
      gDiamond.fillStyle(0xffffff, 0.8);
      gDiamond.fillCircle(16, 8, 3);
      gDiamond.generateTexture(ASSETS.IMAGES.EGG_DIAMOND, 32, 32);
    }

    // --- STAR ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_STAR)) {
      const gStar = (this as any).make.graphics({ x: 0, y: 0, add: false });
      gStar.fillStyle(0xfacc15, 0.2);
      gStar.fillCircle(16, 16, 16);
      gStar.fillStyle(0xfacc15, 1);
      const starPoints: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 15 : 7;
          const angle = (Math.PI / 5) * i - (Math.PI / 2);
          starPoints.push(new Phaser.Geom.Point(16 + Math.cos(angle) * r, 16 + Math.sin(angle) * r));
      }
      gStar.fillPoints(starPoints);
      gStar.fillStyle(0xffffff, 0.6);
      gStar.fillPoints([
          new Phaser.Geom.Point(16, 5),
          new Phaser.Geom.Point(16, 16),
          new Phaser.Geom.Point(10, 12)
      ]);
      gStar.generateTexture(ASSETS.IMAGES.EGG_STAR, 32, 32);
    }

    // --- DRAGON SCALE ---
    if (!(this as any).textures.exists(ASSETS.IMAGES.EGG_SCALE)) {
      const gScale = (this as any).make.graphics({ x: 0, y: 0, add: false });
      gScale.fillStyle(0x065f46, 0.3);
      gScale.fillEllipse(16, 24, 20, 10);
      gScale.fillStyle(0x10b981, 1);
      gScale.beginPath();
      gScale.moveTo(4, 10);
      gScale.lineTo(28, 10);
      gScale.lineTo(16, 30);
      gScale.closePath();
      gScale.fillPath();
      gScale.fillEllipse(16, 10, 24, 12);
      gScale.lineStyle(2, 0x064e3b, 1);
      gScale.strokeEllipse(16, 10, 24, 12);
      gScale.fillStyle(0x6ee7b7, 0.5);
      gScale.fillEllipse(12, 8, 8, 4);
      gScale.generateTexture(ASSETS.IMAGES.EGG_SCALE, 32, 32);
    }

    // --- SPLAT ---
    if (!(this as any).textures.exists('egg_splat')) {
      const splat = (this as any).make.graphics({ x: 0, y: 0, add: false });
      splat.fillStyle(0xf1f5f9, 0.7);
      splat.fillCircle(16, 16, 14);
      splat.fillEllipse(16, 16, 30, 12);
      splat.fillStyle(0xfacc15, 1);
      splat.fillCircle(16, 14, 7);
      splat.fillStyle(0xffffff, 0.6);
      splat.fillCircle(14, 12, 2);
      splat.generateTexture('egg_splat', 32, 32);
    }
  }
}
