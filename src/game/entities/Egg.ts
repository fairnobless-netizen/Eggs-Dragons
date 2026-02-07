
import Phaser from 'phaser';
import { ASSETS } from '../../app/config';
import { RampsSystem } from '../systems/Ramps';

export enum EggType {
  NORMAL = 'normal',
  GOLD = 'gold',
  CRACKED = 'cracked'
}

export class Egg extends Phaser.GameObjects.Sprite {
  public lane: number;
  public progress: number = 0;
  public isActive: boolean = true;
  
  private ramps: RampsSystem;
  private duration: number = 2000;
  private elapsed: number = 0;

  constructor(scene: Phaser.Scene, ramps: RampsSystem, lane: number, duration: number) {
    // Fix: Updated texture key to ASSETS.IMAGES.EGG_WHITE as 'EGG' is not defined in GAME_CONFIG
    super(scene, 0, 0, ASSETS.IMAGES.EGG_WHITE);
    this.ramps = ramps;
    this.lane = lane;
    this.duration = duration;
    
    scene.add.existing(this);
    this.updatePosition();
    (this as any).setTint(0x000000); // LCD style silhouette initially
  }

  // Method for Spawner compatibility
  activate(speed: number) {
      this.duration = speed;
      this.isActive = true;
  }

  update(delta: number) {
    if (!this.isActive) return;

    this.elapsed += delta;
    this.progress = this.elapsed / this.duration;

    if (this.progress >= 1) {
        this.progress = 1;
    }

    this.updatePosition();
  }

  private updatePosition() {
    // Safe check if ramps is not provided (legacy Spawner usage)
    if (!this.ramps) return; 

    const pos = this.ramps.getPosition(this.lane, this.progress);
    (this as any).setPosition(pos.x, pos.y);
    
    // Scale effect (far to near)
    const scale = 0.5 + (0.5 * this.progress);
    (this as any).setScale(scale);

    // LCD Fade-in effect (simulated by alpha)
    if (this.progress > 0.9) {
        (this as any).setTint(0xff0000); // Warning color near player
    } else {
        (this as any).clearTint();
    }
  }
}