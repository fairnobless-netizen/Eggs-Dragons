
import Phaser from 'phaser';
import { GAME_CONFIG, ASSETS, RampPos, LEVEL_DATA, EGG_TYPES, BoostType, TAIL_COLORS, GameState } from '../../app/config';
import { StorageService, PlayerProfile } from '../../app/storage';
import { gameBridge } from '../../app/gameBridge';
import { soundService } from '../../app/sound';
import { TelegramService } from '../../app/telegram';
import { ApiClient } from '../../net/apiClient';
import { RampsSystem } from '../systems/Ramps';
import { EggMovementSystem } from '../systems/EggMovement';
import { BoostsSystem } from '../systems/Boosts';

export class PlayScene extends Phaser.Scene {
  private profile!: PlayerProfile;
  private backgroundLayer!: Phaser.GameObjects.Rectangle;
  private ramps!: RampsSystem;
  private eggs!: EggMovementSystem;
  private boosts!: BoostsSystem;
  private laneVisuals!: Phaser.GameObjects.Group;
  
  private magnetGlow!: Phaser.GameObjects.Graphics;
  private dragonSprite!: Phaser.GameObjects.Sprite;
  private dragonContainer!: Phaser.GameObjects.Container;
  // чтобы не спамить прыжок при каждом тике/пересчёте
  private dragonHopBusy = false;
  
  private freezeOverlay!: Phaser.GameObjects.Rectangle;
  private shieldOverlay!: Phaser.GameObjects.Rectangle;
  
  private snowEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private spawnEvent!: Phaser.Time.TimerEvent;
  private dragonLane: RampPos = RampPos.LEFT_TOP;
  
  private currentLevelIndex: number = 0;
  private currentRampColor: number = 0x334155;
  
  private score: number = 0;
  private lives: number = 3;
  private totalStars: number = 0;
  private totalScales: number = 0;
  
  private state: GameState | 'WAITING_START' = 'WAITING_START';
  private activeTimeInLevel: number = 0;
  private isHard: boolean = false;
  
  private tailCooldownTimer: number = 0;
  private tailHighlightUntil: number = 0;
  
  private wingsCooldownTimer: number = 0;
  private wingsHighlightUntil: number = 0;
  
  private legsCooldownTimer: number = 0;
  private legsCharged: boolean = false;
  private legsHighlightUntil: number = 0;

  private levelTimeRemaining: number = 60000;
  private isFirstStart: boolean = true;

  // Audio
  private bgMusic: Phaser.Sound.BaseSound | null = null;
  private bgmTargetVolume: number = 0.2;

  constructor() { super('PlayScene'); }

  create() {
    this.profile = StorageService.getProfile();
    soundService.init(); 
    this.backgroundLayer = (this as any).add.rectangle(0, 0, 800, 600, 0x000000).setOrigin(0);
    this.ramps = new RampsSystem(this);
    this.eggs = new EggMovementSystem(this, this.ramps);
    this.boosts = new BoostsSystem(this);
    
    this.laneVisuals = (this as any).add.group();
    this.createDragon();

    // Overlays for Boosts
    this.freezeOverlay = (this as any).add.rectangle(0, 0, 800, 600, 0x0ea5e9, 0).setOrigin(0).setDepth(200);
    this.shieldOverlay = (this as any).add.rectangle(0, 0, 800, 600, 0xfb923c, 0).setOrigin(0).setDepth(200);

    this.snowEmitter = (this as any).add.particles(0, 0, ASSETS.IMAGES.EGG_WHITE, {
        x: { min: -100, max: 800 },
        y: { min: -100, max: -20 },
        lifespan: 5000,
        speedX: { min: 50, max: 120 },
        speedY: { min: 50, max: 150 },
        scale: { start: 0.1, end: 0.02 },
        alpha: { start: 0.8, end: 0 },
        quantity: 1,
        frequency: 50,
        emitting: false
    });
    this.snowEmitter.setDepth(201);

    // Setup Background Music
    const existingMusic = (this as any).sound.get('bg_music');
    if (existingMusic) {
        this.bgMusic = existingMusic;
    } else if ((this as any).cache.audio.exists('bg_music')) {
        // Only add if not present and asset is loaded
        this.bgMusic = (this as any).sound.add('bg_music', { loop: true, volume: 0 });
    }

    this.setupBridgeListeners();
    this.applyLevelConfig();

    // Use overlap event instead of position check
    (this as any).events.on('EGG_CAUGHT', (egg: any) => this.handleCatch(egg));
    (this as any).events.on('EGG_HIT_FLOOR', (egg: any) => this.handleMiss(egg));

    this.resetGame();
  }

  // Helper to determine max lives based on mode (Single vs Multiplayer) AND Iron Body
  private getMaxLives(): number {
      const isMultiplayer = false; 
      // Hard cap from config for UI safety
      const absoluteMax = isMultiplayer ? GAME_CONFIG.MAX_LIVES_MULTIPLAYER : GAME_CONFIG.MAX_LIVES_SINGLE;
      
      // Calculated max based on skills (Baseline + Iron Body)
      const calculated = GAME_CONFIG.INITIAL_LIVES + (this.profile.skins.ironBodyOwned ? 1 : 0);
      
      return Math.min(calculated, absoluteMax);
  }

private createDragon() {
  // Градиент/глоу под драконом (для псевдоподсветок)
  this.magnetGlow = (this as any).add.graphics();
  this.magnetGlow.setDepth(99);

  // Sprite из atlas (ключ = ASSETS.IMAGES.DRAGON, первый кадр = f_0_0)
  this.dragonSprite = (this as any).add
    .sprite(0, 0, ASSETS.IMAGES.DRAGON, 'f_0_0')
    .setOrigin(0.5, 0.75);

  // Контейнер, чтобы мы могли скейлить/флипать всё разом (sprite + glow)
  this.dragonContainer = (this as any).add.container(0, 0, [
    this.magnetGlow,
    this.dragonSprite,
  ]);

  this.dragonContainer.setDepth(100);

  // Создаём анимации 1 раз
  this.ensureDragonAnims();

  // По умолчанию — лёгкий “idle” (можно оставить только hop, если хочешь)
  this.dragonSprite.play('dragon_idle');
  this.dragonSprite.setFrame('f_0_0');
  // Позиционируем по текущему lane
  this.updateDragonPos();
}
private ensureDragonAnims() {
  // чтобы не создавать анимации повторно
  if ((this as any).anims.exists('dragon_hop')) return;

  const frames: Phaser.Types.Animations.AnimationFrame[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      frames.push({ key: ASSETS.IMAGES.DRAGON, frame: `f_${r}_${c}` });
    }
  }

  // === HOP: все 25 кадров за 0.6 секунды ===
(this as any).anims.create({
  key: 'dragon_hop',
  frames,          // все кадры атласа
  duration: 600,   // ✅ ВЕСЬ прыжок = 0.6 сек
  repeat: 0,       // проигрывается ОДИН раз
});

// === IDLE: СТАТИЧНЫЙ (один кадр, без движения) ===
(this as any).anims.create({
  key: 'dragon_idle',
  frames: [frames[0]], // ✅ ТОЛЬКО первый кадр
  frameRate: 1,
  repeat: -1,
});

}



  private applyLevelConfig() {
    // Cycle through level configs if we exceed the defined data
    const config = LEVEL_DATA[this.currentLevelIndex % LEVEL_DATA.length];
    this.backgroundLayer.setFillStyle(config.bgColor);
    this.currentRampColor = config.rampColor;
    this.eggs.setLevel(this.currentLevelIndex);
    this.createRampVisuals(this.currentRampColor);
  }

  private createRampVisuals(color: number) {
    this.laneVisuals?.clear(true, true);
    this.ramps.tracks.forEach((track) => {
      const p1 = track.p0;
      const p2 = track.p1;
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const angle = Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y);
      const laneSprite = (this as any).add.tileSprite(p1.x, p1.y, dist, 24, ASSETS.IMAGES.LANE);
      laneSprite.setOrigin(0, 0.5).setRotation(angle).setAlpha(0.8).setTint(color);
      this.laneVisuals?.add(laneSprite);
    });
  }

  private startMusic() {
    if (this.bgMusic) {
      if (!this.bgMusic.isPlaying) {
        this.bgMusic.play({ volume: 0, loop: true });
      }
      (this as any).tweens.add({
        targets: this.bgMusic,
        volume: this.bgmTargetVolume,
        duration: 800
      });
    }
  }

  private stopMusic() {
    if (this.bgMusic && this.bgMusic.isPlaying) {
      (this as any).tweens.add({
        targets: this.bgMusic,
        volume: 0,
        duration: 500,
        onComplete: () => {
          // Optional: pause instead of stop if we want to resume exact pos
          // this.bgMusic?.pause();
        }
      });
    }
  }

  private resetGame() {
    this.profile = StorageService.getProfile();
    if (this.spawnEvent) this.spawnEvent.remove();
    this.score = 0;
    this.currentLevelIndex = 0;
    this.isHard = false;
    this.eggs.setHard(false);
    
    // Reset Timer
    this.levelTimeRemaining = 60000;
    gameBridge.updateTimer(60);
    
    // Use dynamic max calculation for initial lives
    this.lives = this.getMaxLives();

    this.eggs.clearAll();
    this.boosts.reset();
    this.applyLevelConfig();
    this.activeTimeInLevel = 0;
    
    this.totalStars = this.profile.stars;
    this.totalScales = this.profile.scales;

    // SKILL RESET
    this.tailCooldownTimer = 0;
    const wT = this.profile.skins.wingsTier;
    this.wingsCooldownTimer = wT === 1 ? 24000 : wT === 2 ? 17000 : wT === 3 ? 11000 : 0;
    const lT = this.profile.skins.legsTier;
    this.legsCooldownTimer = lT === 1 ? 25000 : lT === 2 ? 14000 : 0;
    this.legsCharged = false;
    
    gameBridge.updateScore(this.score);
    gameBridge.updateLives(this.lives);
    gameBridge.updateStars(this.totalStars);
    gameBridge.emit('UI_SCALES', this.totalScales);
    gameBridge.emit('UI_INVENTORY', this.profile.inventory);
    
    // Reset music tempo
    if (this.bgMusic && (this.bgMusic as any).rate !== 1.0) {
       (this as any).tweens.add({
           targets: this.bgMusic,
           rate: 1.0,
           duration: 500
       });
    }

    // START STATE LOGIC
    if (this.isFirstStart) {
        this.state = 'WAITING_START';
        // Do not start gameplay yet
    } else {
        this.state = GameState.PLAYING;
        (this as any).scene.resume();
        this.startGameplay();
        this.startMusic();
    }
  }

  private setupBridgeListeners() {
    gameBridge.on('G_START_GAME', () => {
        if (this.state === 'WAITING_START') {
            this.isFirstStart = false;
            this.state = GameState.PLAYING;
            this.startGameplay();
            this.startMusic();
        }
    });

gameBridge.on('G_MOVE_DRAGON', (pos: RampPos) => {
  if (this.state === GameState.PLAYING || this.state === 'WAITING_START') {
    const prevLane = this.dragonLane;

    if (prevLane !== pos) {
      this.dragonLane = pos;
      this.updateDragonPos();
      this.playDragonHop(); // ✅ прыжок ТОЛЬКО по кнопке
    }
  }
});


    
    gameBridge.on('G_FULLSCREEN', (isFull: boolean) => {
        this.ramps.updateLayout(isFull);
        this.updateDragonPos();
        this.createRampVisuals(this.currentRampColor);
    });

    gameBridge.on('G_PROFILE_UPDATE', () => {
        const wasIron = this.profile.skins.ironBodyOwned;
        this.profile = StorageService.getProfile();
        this.eggs.updateProfile(this.profile);
        
        if (!wasIron && this.profile.skins.ironBodyOwned) {
            if (this.lives < this.getMaxLives()) {
                this.lives++;
                gameBridge.updateLives(this.lives);
                this.showFloatingText("+1 MAX LIFE", 0xef4444);
                soundService.playBoost();
            }
        }
    });

    gameBridge.on('G_SET_PAUSE', (paused: boolean) => {
      if (this.state === GameState.GAME_OVER || this.state === GameState.STAGE_CLEARED || this.state === 'WAITING_START') return;
      if (paused) { 
        this.state = GameState.PAUSED; 
        (this as any).scene.pause(); 
        
        // Fade out music
        if (this.bgMusic && this.bgMusic.isPlaying) {
            (this as any).tweens.add({ targets: this.bgMusic, volume: 0, duration: 300 });
        }
      } else { 
        this.state = GameState.PLAYING; 
        (this as any).scene.resume(); 
        
        // Fade in music
        if (this.bgMusic && this.bgMusic.isPlaying) {
            (this as any).tweens.add({ targets: this.bgMusic, volume: this.bgmTargetVolume, duration: 300 });
        }
      }
    });

    gameBridge.on('G_RESTART', () => this.resetGame());
    gameBridge.on('G_ACTIVATE_BOOST', (type: BoostType) => { 
      if (this.state === GameState.PLAYING) {
        if (type === 'refill_hearts') {
            const maxLives = this.getMaxLives();
            if (this.lives < maxLives) {
                this.lives++;
                gameBridge.updateLives(this.lives);
                TelegramService.hapticNotification('success');
                this.showFloatingText("+1 HEART", 0xef4444);
            }
            return; 
        }

        this.boosts.activate(type);
        
        if (type === 'freeze') {
            (this as any).cameras.main.flash(500, 0, 200, 255);
            this.snowEmitter?.start();
        } else if (type === 'shield') {
            const flare = (this as any).add.circle(400, 300, 100, 0xfb923c, 0.8).setDepth(1000);
            (this as any).tweens.add({
                targets: flare,
                scale: 8,
                alpha: 0,
                duration: 500,
                onComplete: () => flare.destroy()
            });
        }
      }
    });

    gameBridge.on('G_SET_DIFFICULTY', (hard: boolean) => {
        this.showDifficultyToast(hard);
    });

    gameBridge.on('G_NEXT_LEVEL', () => {
      this.lives = Math.min(this.lives + 1, this.getMaxLives());
      gameBridge.updateLives(this.lives);
      
      this.currentLevelIndex++;
      this.applyLevelConfig();
      this.state = GameState.PLAYING;
      this.activeTimeInLevel = 0;
      this.eggs.clearAll();

      this.levelTimeRemaining = 60000;
      gameBridge.updateTimer(60);

      (this as any).scene.resume();
      this.startGameplay();
      // Ensure music is playing and rate reset
      this.startMusic();
      if (this.bgMusic) (this.bgMusic as any).rate = 1.0;
    });

    gameBridge.on('G_SOUND_UPDATE', (settings: any) => {
      soundService.updateSettings(settings);
      // Update BGM Volume if needed
      // Note: We use soundService.settings.volume for global mix usually,
      // but here we might want to respect it for bgMusic too.
      // Phaser Sound Manager handles global volume if linked, but let's be safe.
      // For now, simple fixed target.
    });
  }

  private showDifficultyToast(hard: boolean) {
      if (this.state === 'WAITING_START') {
           this.isHard = hard;
           this.eggs.setHard(hard);
           return;
      }
      const prevIsPaused = this.state === GameState.PAUSED;
      if (!prevIsPaused) {
          this.state = GameState.PAUSED;
          (this as any).scene.pause();
      }

      const overlay = (this as any).add.rectangle(400, 300, 800, 600, hard ? 0xef4444 : 0x3b82f6, 0.3)
          .setDepth(1000)
          .setAlpha(0);

      const text = (this as any).add.text(400, 300, hard ? "HARD MODE ON" : "EASY MODE ON", {
          fontSize: '48px', fontWeight: '900', color: '#ffffff', stroke: '#000000', strokeThickness: 6
      }).setOrigin(0.5).setDepth(1001).setAlpha(0);

      (this as any).tweens.add({
          targets: [overlay, text],
          alpha: 1, duration: 300,
          onComplete: () => {
              (this as any).time.delayedCall(hard ? 1200 : 700, () => {
                  (this as any).tweens.add({
                      targets: [overlay, text],
                      alpha: 0, duration: 300,
                      onComplete: () => {
                          overlay.destroy();
                          text.destroy();
                          this.isHard = hard;
                          this.eggs.setHard(hard);
                          if (!prevIsPaused) {
                              this.state = GameState.PLAYING;
                              (this as any).scene.resume();
                          }
                      }
                  });
              });
          }
      });
  }

  private startGameplay() {
    if (this.spawnEvent) this.spawnEvent.remove();
    this.spawnEvent = (this as any).time.addEvent({ 
      delay: 1200, 
      callback: () => this.eggs.spawn(), 
      loop: true 
    });
  }

  private updateTimer(delta: number) {
    if (this.boosts.isTimeFrozen) return;

    this.levelTimeRemaining -= delta;
    if (this.levelTimeRemaining < 0) this.levelTimeRemaining = 0;
    
    // Tempo control for tension
    if (this.bgMusic && (this.bgMusic as any).isPlaying) {
        const isTension = this.levelTimeRemaining < 10000 && this.levelTimeRemaining > 0;
        const currentRate = (this.bgMusic as any).rate || 1.0;
        const targetRate = isTension ? 1.15 : 1.0;
        
        // Manual lerp for smooth transition
        const newRate = Phaser.Math.Linear(currentRate, targetRate, 0.05);
        if (Math.abs(newRate - currentRate) > 0.001) {
            (this.bgMusic as any).setRate(newRate);
        }
    }

    const seconds = Math.ceil(this.levelTimeRemaining / 1000);
    gameBridge.updateTimer(seconds);

    if (this.levelTimeRemaining <= 0) {
        this.completeLevel();
    }
  }

  private completeLevel() {
      this.state = GameState.STAGE_CLEARED;
      (this as any).scene.pause();
      soundService.playLevelComplete();
      this.stopMusic();
      gameBridge.setStageCleared(this.currentLevelIndex + 1);
  }

  update(time: number, delta: number) {
    if (this.state !== GameState.PLAYING) return;
    this.activeTimeInLevel += delta;
    this.boosts.update(time);
    this.eggs.setFreeze(this.boosts.isTimeFrozen);
    this.eggs.setMagnet(this.boosts.isMagnetActive, new Phaser.Math.Vector2(this.dragonContainer.x, this.dragonContainer.y));
    
    // Freeze VFX
    if (this.boosts.isTimeFrozen) {
        const remaining = this.boosts.getRemainingTime('freeze');
        // Fade out in last 2 seconds
        const alpha = remaining < 2000 ? (remaining / 2000) * 0.3 : 0.3;
        this.freezeOverlay?.setAlpha(alpha);
        this.snowEmitter?.setAlpha(Math.min(1, remaining / 1000));
    } else {
        this.snowEmitter?.stop();
        this.freezeOverlay?.setAlpha(0);
    }

    // Shield VFX
    if (this.boosts.isShieldActive) {
        const remaining = this.boosts.getRemainingTime('shield');
        // Fade out in last 2 seconds
        const alpha = remaining < 2000 ? (remaining / 2000) * 0.3 : 0.3;
        this.shieldOverlay?.setAlpha(alpha);
    } else {
        this.shieldOverlay?.setAlpha(0);
    }
    
    // Magnet VFX
    if (this.boosts.isMagnetActive) {
        const remaining = this.boosts.getRemainingTime('magnet');
        const pulse = 0.5 + 0.5 * Math.sin(time / 100);
        const glowY = this.dragonSprite ? -0.2 * this.dragonSprite.displayHeight : 0;

        this.magnetGlow.clear();
        this.magnetGlow.fillStyle(0xfacc15, 0.3 * pulse);
        this.magnetGlow.fillCircle(0, glowY, 60 + 10 * pulse);

    } else {
        this.magnetGlow.clear();
    }
    
    // --- SKILLS LOGIC START ---
    
    // 1. TAIL COOLDOWN (Ticks down always if not ready)
    if (this.tailCooldownTimer > 0) {
      this.tailCooldownTimer -= delta;
    }

    // 2. WINGS COOLDOWN & TRIGGER
    const wT = this.profile.skins.wingsTier;
    if (wT > 0) {
      // Cooldown does NOT run during active phase (manual or auto)
      if (!this.boosts.isMagnetActive) {
        this.wingsCooldownTimer -= delta;
        if (this.wingsCooldownTimer <= 0) {
          // Trigger Auto Magnet (3s)
          this.boosts.activate('magnet', 3000);
          this.wingsHighlightUntil = time + 3000;
          this.showFloatingText("MAGNET!", 0xfacc15);
          // Reset cooldown
          this.wingsCooldownTimer = wT === 1 ? 24000 : wT === 2 ? 17000 : 11000;
        }
      }
    }

    // 3. LEGS COOLDOWN & CHARGE
    const lT = this.profile.skins.legsTier;
    if (lT > 0) {
      if (!this.legsCharged) {
        this.legsCooldownTimer -= delta;
        if (this.legsCooldownTimer <= 0) {
          this.legsCharged = true;
          this.showFloatingText("DODGE READY", 0x22c55e);
          this.legsHighlightUntil = time + 1000; // Visual flash
        }
      }
    }

    // --- SKILLS LOGIC END ---

    this.updateDragonHighlights(time);
    
    let dragonBounds = this.dragonContainer.getBounds();
    
    // Legacy visual fix, unrelated to logic logic
    if (this.profile.skins.tailTier >= 3) {
        const expansion = 300; 
        dragonBounds.y -= expansion / 2;
        dragonBounds.height += expansion;
    }
    
    this.eggs.update(delta, dragonBounds, this.dragonLane);
    
    this.updateTimer(delta);
    
    // Procedural sound removed
    // soundService.setBGMScale(...);
  }

  private updateDragonHighlights(time: number) {
  if (!this.dragonContainer || !this.magnetGlow) return;

  // базовая прозрачность (очень мягко)
  let baseAlpha = 0.12;
  let radius = 90;
  let color = 0x60a5fa; // default calm blue

  // === СОСТОЯНИЯ / БУСТЫ ===

  // Магнит
  if (this.boosts?.isMagnetActive) {
    color = 0x38bdf8; // cyan
    baseAlpha = 0.22;
    radius = 110;
  }

  // Хвост (атака / удар)
  if (time < this.tailHighlightUntil) {
    color = 0xf97316; // orange
    baseAlpha = 0.25;
    radius = 105;
  }

  // Крылья (ускорение / контроль)
  if (time < this.wingsHighlightUntil) {
    color = 0xfacc15; // yellow
    baseAlpha = 0.22;
    radius = 100;
  }

  // Ноги (заряд / прыжок)
  if (time < this.legsHighlightUntil) {
    color = 0x22c55e; // green
    baseAlpha = 0.20;
    radius = 95;
  }

    // === ПУЛЬС (очень мягкий) ===
  const pulse = 0.85 + 0.15 * Math.sin(time / 220);

  // если нет активных эффектов — ничего не рисуем (убираем постоянный “синий” круг)
  const hasAnyEffect =
    (this.boosts?.isMagnetActive ?? false) ||
    time < this.tailHighlightUntil ||
    time < this.wingsHighlightUntil ||
    time < this.legsHighlightUntil;

  this.magnetGlow.clear();

  if (!hasAnyEffect) {
    return;
  }

  // центр подсветки — тело дракона
  const glowY = this.dragonSprite
    ? -0.2 * this.dragonSprite.displayHeight
    : 0;

  // ОДИН круг — без лишних “внешних” колец
  this.magnetGlow.fillStyle(color, baseAlpha * pulse);
  this.magnetGlow.fillCircle(0, glowY, radius);
}

private playDragonHop() {
  if (!this.dragonSprite) return;
  if (this.dragonHopBusy) return;

  this.dragonHopBusy = true;

  this.dragonSprite.play('dragon_hop');

  this.dragonSprite.once(
    Phaser.Animations.Events.ANIMATION_COMPLETE,
    () => {
      this.dragonHopBusy = false;

      // вернёмся в статичный idle
      this.dragonSprite?.play('dragon_idle');
      // на всякий случай “зафиксируем” кадр:
      this.dragonSprite?.setFrame('f_0_0');
    }
  );
}


updateDragonPos() {
  if (!this.dragonContainer) return;

  const lane = this.dragonLane;
  const pos = this.ramps.getDragonCatchPosition(lane);

  this.dragonContainer.setPosition(pos.x, pos.y);

  // Делаем дракона на 10% меньше
  const baseScale = 0.9;

  /**
   * Наш спрайт СМОТРИТ ВПРАВО по умолчанию.
   * Значит:
   * - на ЛЕВЫХ рампах зеркалим (чтобы смотрел влево к рампе)
   * - на ПРАВЫХ оставляем как есть
   */
  const isLeft = lane === RampPos.LEFT_TOP || lane === RampPos.LEFT_BOT;

  this.dragonContainer.setScale(isLeft ? -baseScale : baseScale, baseScale);
  
}


  private handleCatch(egg: any) {
    if (this.state !== GameState.PLAYING) return;

    const isBomb = egg.type === 'BOMB';

    if (egg.lane !== this.dragonLane && this.profile.skins.tailTier >= 3) {
        this.tailHighlightUntil = (this as any).time.now + 200;
    }

    if (isBomb) {
        let ignoredDamage = false;

        // Priority 1: Shield
        if (this.boosts.isShieldActive) {
            // Shield active for 10s protects against all bombs/life loss
            soundService.playCatch();
            ignoredDamage = true;
        } 
        // Priority 2: Legs Dodge
        else if (this.legsCharged) {
            this.legsCharged = false;
            const lT = this.profile.skins.legsTier;
            this.legsCooldownTimer = lT === 1 ? 25000 : 14000;
            
            this.legsHighlightUntil = (this as any).time.now + 500;
            this.showFloatingText("DODGED!", 0x22c55e);
            soundService.playCatch(); // Positive sound
            ignoredDamage = true;
        }

        if (!ignoredDamage) {
          soundService.playMiss();
          (this as any).cameras.main.shake(300, 0.02);
          this.lives = Math.max(0, this.lives - 1);
          gameBridge.updateLives(this.lives);
          TelegramService.hapticNotification('error');
          if (this.lives <= 0) { 
            this.state = GameState.GAME_OVER; 
            this.stopMusic();
            soundService.playGameOver();
            gameBridge.setGameOver(this.score);
            // Submit score using stored profile username
            ApiClient.submitScore(this.score, undefined, this.profile.username);
          }
        }
    } else {
        soundService.playCatch();
        // Updated Crystal Body Multiplier to 1.2
        const crystalMult = this.profile.skins.crystalBodyOwned ? 1.2 : 1.0;
        
        const type = EGG_TYPES[egg.type as keyof typeof EGG_TYPES];
        if (type) {
             // Combo removed, flat points
             const points = Math.floor((type.score ?? 10) * crystalMult);
             
             const oldScore = this.score;
             this.score += points;

             // +1 Life for every 1000 points earned
             if (Math.floor(this.score / 1000) > Math.floor(oldScore / 1000)) {
                 if (this.lives < this.getMaxLives()) {
                     this.lives++;
                     gameBridge.updateLives(this.lives);
                     TelegramService.hapticNotification('success');
                     this.showFloatingText("+1 LIFE", 0xef4444);
                 }
             }

             const metadata = type as any;
             if (metadata.star) {
               this.totalStars = StorageService.addStars(metadata.star);
               gameBridge.updateStars(this.totalStars);
             }
             if (metadata.scale) {
               this.totalScales = StorageService.addScales(metadata.scale);
               gameBridge.emit('UI_SCALES', this.totalScales);
             }
        }

        gameBridge.updateScore(this.score);
        TelegramService.hapticImpact('light');
    }
    
    this.eggs.removeEgg(egg);
  }

  private handleMiss(egg: any) {
    if (this.state !== GameState.PLAYING) return;
    const typeCfg = EGG_TYPES[egg.type as keyof typeof EGG_TYPES];
    if (!typeCfg) return;
    
    if (!typeCfg.isMissable) return;
    if (this.boosts.isShieldActive) return; // Shield prevents life loss and score penalty, simply ignore.

    // Tail Auto-Burn Logic
    // Trigger: Egg hits floor (here).
    // Behavior: If ready, burn, count score, start cooldown.
    const tT = this.profile.skins.tailTier;
    if (tT >= 1 && this.tailCooldownTimer <= 0) {
        // Cooldown Ready - Save the egg
        this.tailCooldownTimer = tT === 1 ? 30000 : tT === 2 ? 20000 : 10000;
        this.tailHighlightUntil = (this as any).time.now + 500;
        
        // Visual Feedback (Burn)
        (this as any).cameras.main.flash(200, 255, 100, 0); 
        this.showFloatingText("BURNT!", 0xff5252);
        
        // Count as caught (add score)
        // We call handleCatch logic manually to reuse scoring, but bypass catch animation/position
        this.handleCatch(egg);
        return;
    }

    soundService.playMiss();
    (this as any).cameras.main.shake(200, 0.01);
    this.lives = Math.max(0, this.lives - 1);
    gameBridge.updateLives(this.lives);
    TelegramService.hapticNotification('error');

    if (this.lives <= 0) { 
      this.state = GameState.GAME_OVER; 
      this.stopMusic();
      soundService.playGameOver();
      gameBridge.setGameOver(this.score);
      // Submit score
      ApiClient.submitScore(this.score, undefined, this.profile.username);
    }
  }

  private showFloatingText(msg: string, color: number) {
      const popup = (this as any).add.text(this.dragonContainer.x, this.dragonContainer.y - 50, msg, {
          fontSize: '20px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(500);
      popup.setTint(color);
      
      (this as any).tweens.add({
          targets: popup,
          y: popup.y - 40,
          alpha: 0,
          duration: 1000,
          onComplete: () => popup.destroy()
      });
  }
}
