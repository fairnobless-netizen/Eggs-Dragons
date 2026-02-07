
import Phaser from 'phaser';
import { ASSETS, RampPos } from '../../app/config';
import { RampsSystem } from '../systems/Ramps';

export class Dragon extends Phaser.GameObjects.Sprite {
  private currentLane: number = RampPos.LEFT_TOP;
  private ramps: RampsSystem;

  constructor(scene: Phaser.Scene, ramps: RampsSystem) {
    super(scene, 0, 0, ASSETS.IMAGES.DRAGON);
    this.ramps = ramps;
    
    scene.add.existing(this);
    (this as any).setScale(1.2);
    
    // Initial pose
    this.setLane(RampPos.LEFT_TOP);
  }

  setLane(lane: number) {
    this.currentLane = lane;
    // Fix: Updated call from getCatchPosition to getDragonCatchPosition to match the RampsSystem class definition
    const pos = this.ramps.getDragonCatchPosition(lane);
    
    (this as any).setPosition(pos.x, pos.y);

    // Flip X for Right side
    (this as any).setFlipX(lane === RampPos.RIGHT_TOP || lane === RampPos.RIGHT_BOT);
    
    // Simple rotation for visual flair
    // Top lanes look up, Bot lanes look down
    if (lane === RampPos.LEFT_TOP || lane === RampPos.RIGHT_TOP) {
        (this as any).setAngle(lane === RampPos.LEFT_TOP ? -15 : 15);
    } else {
        (this as any).setAngle(lane === RampPos.LEFT_BOT ? 15 : -15);
    }
  }

  getCurrentLane() {
    return this.currentLane;
  }

  moveLeft() {
    // Toggle between Left Top/Bot
    if (this.currentLane === RampPos.LEFT_TOP) {
        this.setLane(RampPos.LEFT_BOT);
    } else {
        this.setLane(RampPos.LEFT_TOP);
    }
  }

  moveRight() {
    // Toggle between Right Top/Bot
    if (this.currentLane === RampPos.RIGHT_TOP) {
        this.setLane(RampPos.RIGHT_BOT);
    } else {
        this.setLane(RampPos.RIGHT_TOP);
    }
  }
}
