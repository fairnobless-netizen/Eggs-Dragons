
import Phaser from 'phaser';
import { ASSETS, RampPos } from '../../app/config';
import { RampsSystem } from '../systems/Ramps';

export class Dragon extends Phaser.GameObjects.Sprite {
  private currentLane: number = RampPos.LEFT_TOP;
  private ramps: RampsSystem;

  private static readonly ANIM_FLY = 'dragon_fly';
  private static readonly ANIM_IDLE = 'dragon_idle';

  constructor(scene: Phaser.Scene, ramps: RampsSystem) {
    super(scene, 0, 0, ASSETS.IMAGES.DRAGON, 'f_0_0');
    this.ramps = ramps;

    scene.add.existing(this);

    // Scale can be tweaked later; keep your current value
    this.setScale(1.2);

    // Ensure atlas animations exist (only created once per Scene)
    this.ensureAnims(scene);

    // Start with an animation (fallback to first frame if anim missing)
    if (scene.anims.exists(Dragon.ANIM_FLY)) {
      this.play(Dragon.ANIM_FLY);
    } else {
      this.setFrame('f_0_0');
    }

    // Initial pose
    this.setLane(RampPos.LEFT_TOP);
  }

  private ensureAnims(scene: Phaser.Scene) {
    const anims = scene.anims;

    // Fly loop (row 0)
    if (!anims.exists(Dragon.ANIM_FLY)) {
      anims.create({
        key: Dragon.ANIM_FLY,
        frames: [
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_0_0' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_0_1' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_0_2' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_0_3' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_0_4' },
        ],
        frameRate: 10,
        repeat: -1,
      });
    }

    // Idle loop (row 1)
    if (!anims.exists(Dragon.ANIM_IDLE)) {
      anims.create({
        key: Dragon.ANIM_IDLE,
        frames: [
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_1_0' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_1_1' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_1_2' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_1_3' },
          { key: ASSETS.IMAGES.DRAGON, frame: 'f_1_4' },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }
  }

  setLane(lane: number) {
    this.currentLane = lane;

    // Updated call from getCatchPosition to getDragonCatchPosition to match the RampsSystem class definition
    const pos = this.ramps.getDragonCatchPosition(lane);

    this.setPosition(pos.x, pos.y);

    // Flip X for Right side (muzzle direction)
    this.setFlipX(lane === RampPos.RIGHT_TOP || lane === RampPos.RIGHT_BOT);

    // Simple rotation for visual flair
    // Top lanes look up, Bot lanes look down
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

