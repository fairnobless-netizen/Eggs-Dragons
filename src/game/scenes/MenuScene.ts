
import Phaser from 'phaser';
import { StorageService } from '../../app/storage';
import { ASSETS } from '../../app/config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = (this as any).scale;

    // Background
    (this as any).add.tileSprite(width / 2, height / 2, width, height, ASSETS.IMAGES.BG);

    // Title
    (this as any).add.text(width / 2, height * 0.3, 'DRAGON EGG\nCATCHER', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Best Score
    const bestScore = StorageService.getBestScore();
    (this as any).add.text(width / 2, height * 0.45, `Best Score: ${bestScore}`, {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Play Button
    const btnBox = (this as any).add.rectangle(width / 2, height * 0.6, 200, 60, 0x00ff00)
      .setInteractive()
      .on('pointerdown', () => this.startGame());
    
    (this as any).add.text(width / 2, height * 0.6, 'PLAY', {
      fontSize: '32px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Simple idle animation
    (this as any).tweens.add({
      targets: btnBox,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  startGame() {
    (this as any).scene.start('PlayScene');
  }
}
