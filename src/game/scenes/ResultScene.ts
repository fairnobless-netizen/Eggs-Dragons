
import Phaser from 'phaser';
import { StorageService } from '../../app/storage';
import { ApiClient } from '../../net/apiClient';
import { TelegramService } from '../../app/telegram';

export class ResultScene extends Phaser.Scene {
  private score: number = 0;

  constructor() {
    super('ResultScene');
  }

  init(data: { score: number }) {
    this.score = data.score;
  }

  create() {
    const { width, height } = (this as any).scale;

    // Fade out music if still playing
    const music = (this as any).sound.get('bg_music');
    if (music && music.isPlaying) {
        (this as any).tweens.add({
            targets: music,
            volume: 0,
            duration: 1000,
            onComplete: () => music.stop()
        });
    }

    // Save Score
    StorageService.setBestScore(this.score);
    
    // BACKEND_TODO: Real implementation calls ApiClient.submitScore(this.score);
    // We call mock for now
    ApiClient.submitScore(this.score).then(res => {
      console.log('Score submitted', res);
    });

    // UI
    (this as any).add.text(width / 2, height * 0.3, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    (this as any).add.text(width / 2, height * 0.45, `Score: ${this.score}`, {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Restart Button
    const btnBox = (this as any).add.rectangle(width / 2, height * 0.6, 200, 60, 0x00ff00)
      .setInteractive()
      .on('pointerdown', () => this.restart());
    
    (this as any).add.text(width / 2, height * 0.6, 'RETRY', {
      fontSize: '32px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    TelegramService.hapticNotification('error');
  }

  restart() {
    (this as any).scene.start('PlayScene');
  }
}
