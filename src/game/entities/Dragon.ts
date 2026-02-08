
import Phaser from 'phaser';
import { ASSETS, RampPos } from '../../app/config';
import { RampsSystem } from '../systems/Ramps';

export class Dragon extends Phaser.GameObjects.Sprite {
  private currentLane: number = RampPos.LEFT_TOP;
  private ramps: RampsSystem;

  constructor(scene: Phaser.Scene, ramps: RampsSystem) {
    super(scene, 0, 0, ASSETS.IMAGES.DRAGON, 'f_0_0');
    this.ramps = ramps;

    scene.add.existing(this);

    // ~10% меньше чем было (было 1.2)
    this.setScale(1.08);

    // Initial pose
    this.setLane(RampPos.LEFT_TOP);
  }

  setLane(lane: number) {
    this.currentLane = lane;

    const pos = this.ramps.getDragonCatchPosition(lane);
    this.setPosition(pos.x, pos.y);

    /**
     * ВАЖНО:
     * наш спрайт смотрит ВПРАВО по умолчанию.
     * Значит для ЛЕВЫХ рамп надо зеркалить (flipX = true),
     * а для ПРАВЫХ — НЕ зеркалить.
     */
    const isLeft = lane === RampPos.LEFT_TOP || lane === RampPos.LEFT_BOT;
    this.setFlipX(isLeft);

    // Rotation (как было, можно оставить)
    if (lane === RampPos.LEFT_TOP || lane === RampPos.RIGHT_TOP) {
      this.setAngle(lane === RampPos.LEFT_TOP ? -15 : 15);
    } else {
      this.setAngle(lane === RampPos.LEFT_BOT ? 15 : -15);
    }
  }

  getCurrentLane() {
    return this.currentLane;
  }

  moveLeft() {
    if (this.currentLane === RampPos.LEFT_TOP) {
      this.setLane(RampPos.LEFT_BOT);
    } else {
      this.setLane(RampPos.LEFT_TOP);
    }
  }

  moveRight() {
    if (this.currentLane === RampPos.RIGHT_TOP) {
      this.setLane(RampPos.RIGHT_BOT);
    } else {
      this.setLane(RampPos.RIGHT_TOP);
    }
  }
}
