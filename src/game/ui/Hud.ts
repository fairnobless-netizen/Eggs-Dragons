import Phaser from 'phaser';

export class Hud {
  private scoreText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private livesText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const style = { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold' };
    
    this.scoreText = scene.add.text(20, 20, 'Score: 0', style);
    this.livesText = scene.add.text(scene.scale.width - 20, 20, 'Lives: 3', style).setOrigin(1, 0);
    this.comboText = scene.add.text(scene.scale.width / 2, 50, '', { ...style, color: '#ffd700' }).setOrigin(0.5);
  }

  update(score: number, lives: number, combo: number) {
    this.scoreText.setText(`Score: ${score}`);
    this.livesText.setText(`Lives: ${lives}`);
    
    if (combo > 1) {
      this.comboText.setText(`COMBO x${combo}`);
      this.comboText.setVisible(true);
      this.comboText.setScale(1 + (combo * 0.05)); // Pulse effect
    } else {
      this.comboText.setVisible(false);
    }
  }
}