
import Phaser from 'phaser';
import { GAME_CONFIG, EGG_TYPES, RampPos, TAIL_COLORS } from '../../app/config';
import { RampsSystem } from './Ramps';
import { StorageService, PlayerProfile } from '../../app/storage';

const FALL_GRAVITY = 0.012;
const BALLISTIC_GRAVITY = 0.004;
const CENTER_DRIFT_ACCEL = 0.00008; 
const MAX_EXIT_VELOCITY = 0.7; 

// Visual Offset Configuration
const RAMP_THICKNESS_HALF = 12; // Half of visual ramp height (24px)
const EGG_RADIUS_AVG = 15;      // Approximate visual radius of egg
const SURFACE_OFFSET = RAMP_THICKNESS_HALF + EGG_RADIUS_AVG; // Total offset from centerline

// Scaling Factor for all items (2.5x larger)
const ITEM_SCALE_MULTIPLIER = 0.5;

export class EggMovementSystem {
  private eggs: any[] = [];
  private scene: Phaser.Scene;
  private ramps: RampsSystem;
  private floorY: number;
  
  public timeScale: number = 1.0;
  private isHard: boolean = false;
  private isFreezeActive: boolean = false;
  private isMagnetActive: boolean = false;
  private dragonTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

  private currentLevelIndex: number = 0;
  private activeTimeInLevel: number = 0; 
  private profile: PlayerProfile;

  constructor(scene: Phaser.Scene, ramps: RampsSystem) {
  this.scene = scene;
  this.ramps = ramps;

  // Use Phaser base size as source of truth for geometry.
  // (Game.ts uses scale.width=1200,height=600, while GAME_CONFIG may differ.)
  const baseH = (this.scene.scale as any)?.baseSize?.height ?? GAME_CONFIG.HEIGHT;
  this.floorY = baseH - 40;

  this.profile = StorageService.getProfile();
}


  setLevel(idx: number) {
    this.currentLevelIndex = idx;
    this.activeTimeInLevel = 0;
    this.profile = StorageService.getProfile(); 
  }

  updateProfile(profile: PlayerProfile) {
    this.profile = profile;
  }

  setHard(hard: boolean) { this.isHard = hard; }
  setFreeze(active: boolean) { this.isFreezeActive = active; }
  setMagnet(active: boolean, target: Phaser.Math.Vector2) {
    this.isMagnetActive = active;
    this.dragonTarget = target;
  }

  spawn() {
    const lane = Phaser.Math.Between(0, 3) as RampPos;
    const typeKey = this.getRandomType() as keyof typeof EGG_TYPES;
    
    // Determine spawn start point with offset
    const startT = 0;
    const track = this.ramps.tracks[lane];
    const point = track.getPoint(startT);
    const tangent = track.getTangent();
    
    // Calculate Perpendicular Offset (Normal Vector pointing UP relative to ramp)
    // Left Lanes (0,1): Ramp goes Right. Tangent (+x, +y). Normal (+y, -x) = CW 90
    // Right Lanes (2,3): Ramp goes Left. Tangent (-x, +y). Normal (-y, x) = CCW 90
    // Simplified: We want Y component to be negative (UP).
    
    let normX = 0, normY = 0;
    if (lane < 2) {
         normX = tangent.y;
         normY = -tangent.x;
    } else {
         normX = -tangent.y;
         normY = tangent.x;
    }

    const startX = point.x + normX * SURFACE_OFFSET;
    const startY = point.y + normY * SURFACE_OFFSET;

    const color = TAIL_COLORS[Math.floor(Math.random() * TAIL_COLORS.length)];
    const tail = this.scene.add.rectangle(startX, startY, 10, 40, color).setOrigin(0.5, 1);
    tail.setAngle(lane < 2 ? -45 : 45);

    this.scene.tweens.add({
      targets: tail,
      angle: lane < 2 ? -90 : 90,
      scaleY: 1.5,
      duration: 400,
      yoyo: true,
      onComplete: () => {
        if (!this.scene || !this.scene.sys) return;
        tail.destroy();
        this.createEgg(lane, typeKey);
      }
    });
  }

  private createEgg(lane: RampPos, typeKey: keyof typeof EGG_TYPES) {
    const type = EGG_TYPES[typeKey];
    const sprite = this.scene.add.sprite(0, 0, type.asset);
    
    this.eggs.push({ 
      sprite, 
      lane, 
      t: 0, 
      type: typeKey, 
      radius: type.radius || 14,
      isFalling: false,
      hasLeftRamp: false, // Tracks if magnet detached it from ramp logic
      magnetLatched: false, // Tracks if attraction started and should persist
      velocity: new Phaser.Math.Vector2(0, 0),
      driftX: (Math.random() - 0.5) * 0.04,
      glideWindowMult: this.profile.skins.wingsTier >= 1 ? 1.5 : 1.0,
    });
    
    // Initial Position Update
    this.updateEggTransform(this.eggs[this.eggs.length - 1]);
  }

  update(delta: number, dragonBounds?: Phaser.Geom.Rectangle, dragonLane?: RampPos) {
    this.activeTimeInLevel += delta;

    const heavyTailMult = this.profile.skins.tailTier >= 1 ? 0.85 : 1.0;
    const baseSpeedForLevel = GAME_CONFIG.BASE_SPEED * Math.pow(GAME_CONFIG.LEVEL_SPEED_STEP, this.currentLevelIndex);
    
    let speedMult = 1.0;
    if (!this.isFreezeActive) {
      speedMult = Math.pow(GAME_CONFIG.TIME_RAMP_MULT, Math.floor(this.activeTimeInLevel / GAME_CONFIG.TIME_RAMP_INTERVAL));
    }

    const baseSpeed = baseSpeedForLevel * speedMult * (this.isHard ? GAME_CONFIG.HARD_MULTIPLIER : 1) * this.timeScale * heavyTailMult;
const baseW = (this.scene.scale as any)?.baseSize?.width ?? GAME_CONFIG.WIDTH;
const centerX = baseW / 2;

    
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const egg = this.eggs[i];
      if (!egg.sprite || !egg.sprite.active) {
        this.eggs.splice(i, 1);
        continue;
      }

      const isBomb = egg.type === 'BOMB';
      let isMagnetPulling = false;

      // Magnet Logic
      if (!isBomb && (this.isMagnetActive || egg.magnetLatched)) {
        egg.magnetLatched = true;
        isMagnetPulling = true;
        egg.hasLeftRamp = true; 
        
        const currentPos = new Phaser.Math.Vector2(egg.sprite.x, egg.sprite.y);
        const pullDir = this.dragonTarget.clone().subtract(currentPos).normalize();
        
        const pullSpeed = 0.8 * delta; 
        egg.sprite.x += pullDir.x * pullSpeed;
        egg.sprite.y += pullDir.y * pullSpeed;
        egg.sprite.rotation += 0.2 * (delta / 16); 
      }

      // Catch Logic
      if (dragonBounds && dragonLane !== undefined) {
          const eggBounds = egg.sprite.getBounds();
          if (Phaser.Geom.Rectangle.Overlaps(dragonBounds, eggBounds)) {
              if (egg.lane === dragonLane || egg.magnetLatched) {
                  this.scene.events.emit('EGG_CAUGHT', egg);
                  this.removeEgg(egg);
                  continue;
              }
          }
      }

      if (isMagnetPulling) {
        continue;
      }

      // Ramp & Fall Logic
      if (!egg.isFalling && !egg.hasLeftRamp) {
        const prevT = egg.t;
        egg.t += baseSpeed * delta;
        
        // Update Transform (Pos + Offset)
        this.updateEggTransform(egg);

        const track = this.ramps.tracks[egg.lane];
        const trackLength = track.getLength();
        const deltaDist = (egg.t - prevT) * trackLength;
        const spinDir = (egg.lane < 2) ? 1 : -1;
        egg.sprite.rotation += spinDir * (deltaDist / egg.radius);

        if (egg.t >= 1) {
          egg.isFalling = true;
          const tangent = track.getTangent(1);
          const exitMagnitude = Math.min(MAX_EXIT_VELOCITY, baseSpeed * trackLength * 12 * egg.glideWindowMult);
          egg.velocity = new Phaser.Math.Vector2(tangent.x * exitMagnitude, tangent.y * exitMagnitude);
        }
      } else {
        // Ballistic Fall
        egg.velocity.y += (egg.sprite.y < this.floorY - 150 ? BALLISTIC_GRAVITY : FALL_GRAVITY) * delta;
        
        const driftDirection = egg.sprite.x < centerX ? 1 : -1;
        egg.velocity.x += driftDirection * CENTER_DRIFT_ACCEL * delta;

        egg.sprite.x += egg.velocity.x * delta;
        egg.sprite.y += egg.velocity.y * delta;
        egg.sprite.rotation += 0.05 * (delta / 16.6);

        if (egg.sprite.y >= this.floorY) {
          this.createSplat(egg.sprite.x, egg.sprite.y, egg.type);
          this.scene.events.emit('EGG_HIT_FLOOR', egg);
          this.removeEgg(egg);
        }
      }
    }
  }

  private updateEggTransform(egg: any) {
      if (egg.t > 1) egg.t = 1;
      const track = this.ramps.tracks[egg.lane];
      const point = track.getPoint(egg.t);
      const tangent = track.getTangent();

      // Recalculate offset (same as spawn)
      let normX = 0, normY = 0;
      if (egg.lane < 2) {
           normX = tangent.y;
           normY = -tangent.x;
      } else {
           normX = -tangent.y;
           normY = tangent.x;
      }

      egg.sprite.x = point.x + normX * SURFACE_OFFSET;
      egg.sprite.y = point.y + normY * SURFACE_OFFSET;
      
      // Scale based on distance for pseudo-depth, massively scaled up
      const baseScale = 0.5 + (0.5 * egg.t);

        // hard clamp to avoid giant items
        const scale = Math.min(baseScale * ITEM_SCALE_MULTIPLIER, 0.15);
        egg.sprite.setScale(scale);


      if (egg.t > 0.9) {
          egg.sprite.setTint(0xff0000); 
      } else {
          egg.sprite.clearTint();
      }
  }

  private createSplat(x: number, y: number, type: string) {
  const splat = this.scene.add.sprite(x, y + 10, 'egg_splat');
  // Scale splat to match new item size roughly
  splat.setDepth(10).setScale(0.5 * ITEM_SCALE_MULTIPLIER);

  // ✅ No tint/color logic — PNG-only visuals

  this.scene.tweens.add({
    targets: splat,
    scaleX: 1.2 * ITEM_SCALE_MULTIPLIER,
    scaleY: 0.8 * ITEM_SCALE_MULTIPLIER,
    alpha: 0,
    duration: 1500,
    onComplete: () => splat.destroy()
  });
}

  removeEgg(egg: any) {
    const idx = this.eggs.indexOf(egg);
    if (idx > -1) {
      if (egg.sprite) {
        egg.sprite.destroy();
        egg.sprite = null;
      }
      this.eggs.splice(idx, 1);
    }
  }

  clearAll() {
    this.eggs.forEach(e => {
      if (e.sprite) e.sprite.destroy();
    });
    this.eggs = [];
  }

  private getRandomType(): string {
    const r = Math.random();
    let acc = 0;
    for (const [key, val] of Object.entries(EGG_TYPES)) {
      acc += val.chance;
      if (r <= acc) return key;
    }
    return 'WHITE';
  }
}
