import Phaser from 'phaser';
import { Dragon } from '../entities/Dragon';

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastLaneChange: number = 0;
  private dragon: Dragon;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, dragon: Dragon) {
    this.scene = scene;
    this.dragon = dragon;
    if (scene.input.keyboard) {
        this.cursors = scene.input.keyboard.createCursorKeys();
    }
    this.setupTouch(scene.scale.width);
  }

  private setupTouch(width: number) {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < width / 2) {
        this.dragon.moveLeft();
      } else {
        this.dragon.moveRight();
      }
    });
  }

  update(time: number) {
    if (!this.cursors) return;

    // Simple cooldown to prevent hyper-scrolling on key hold
    if (time - this.lastLaneChange > 150) {
      if (this.cursors.left.isDown) {
        this.dragon.moveLeft();
        this.lastLaneChange = time;
      } else if (this.cursors.right.isDown) {
        this.dragon.moveRight();
        this.lastLaneChange = time;
      }
    }
  }
}