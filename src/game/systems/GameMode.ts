
import Phaser from 'phaser';
import { GAME_CONFIG } from '../../app/config';

export class GameModeSystem {
  private mode: 'A' | 'B' = 'A';
  private startTime: number = 0;

  constructor() {}

  setMode(mode: 'A' | 'B', time: number) {
    this.mode = mode;
    this.startTime = time;
  }

  getDifficulty(currentTime: number) {
    const elapsed = currentTime - this.startTime;
    const config = this.mode === 'A' ? GAME_CONFIG.MODE_A : GAME_CONFIG.MODE_B;

    // Ramp up difficulty over 60 seconds
    const difficultyFactor = Math.min(elapsed / 60000, 1);

    const spawnInterval = Phaser.Math.Linear(
        config.SPAWN_INTERVAL_START, 
        config.SPAWN_INTERVAL_MIN, 
        difficultyFactor
    );

    const speedDuration = Phaser.Math.Linear(
        config.SPEED_DURATION_START,
        config.SPEED_DURATION_MIN,
        difficultyFactor
    );

    return { spawnInterval, speedDuration };
  }

  getMode() { return this.mode; }
}
