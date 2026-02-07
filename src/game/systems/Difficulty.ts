
import Phaser from 'phaser';
import { GAME_CONFIG } from '../../app/config';

export class DifficultySystem {
  private startTime: number;
  private difficultyOffset: number = 0; // Added manually by "Difficulty Up"

  constructor(scene: Phaser.Scene) {
    this.startTime = scene.time.now;
  }

  forceDifficultyUp() {
    // Artificially age the game by 30 seconds to make it harder
    this.difficultyOffset += 30000;
  }

  getSpawnDelay(currentTime: number): number {
    const elapsed = (currentTime - this.startTime) + this.difficultyOffset;
    const reduction = Math.floor(elapsed / 10000) * 100;
    // Use MODE_A config as default values
    return Math.max(GAME_CONFIG.MODE_A.SPAWN_INTERVAL_MIN, GAME_CONFIG.MODE_A.SPAWN_INTERVAL_START - reduction);
  }

  getEggSpeed(currentTime: number): number {
    const elapsed = (currentTime - this.startTime) + this.difficultyOffset;
    const reduction = Math.floor(elapsed / 10000) * 100;
    // Return duration (lower is faster).
    // Ensure we don't go below the minimum duration (maximum speed).
    return Math.max(GAME_CONFIG.MODE_A.SPEED_DURATION_MIN, GAME_CONFIG.MODE_A.SPEED_DURATION_START - reduction);
  }
}
