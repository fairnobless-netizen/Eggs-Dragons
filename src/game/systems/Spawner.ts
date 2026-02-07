
import Phaser from 'phaser';
import { Egg, EggType } from '../entities/Egg';
import { DifficultySystem } from './Difficulty';
import { GAME_CONFIG } from '../../app/config';

export class Spawner {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  private difficulty: DifficultySystem;
  private nextSpawnTime: number = 0;
  private laneWidth: number;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, laneWidth: number) {
    this.scene = scene;
    this.group = group;
    this.laneWidth = laneWidth;
    this.difficulty = new DifficultySystem(scene);
  }

  update(time: number) {
    if (time > this.nextSpawnTime) {
      this.spawn(time);
      this.nextSpawnTime = time + this.difficulty.getSpawnDelay(time);
    }
  }

  private spawn(time: number) {
    // Pick random lane
    const lane = Phaser.Math.Between(0, GAME_CONFIG.LANES - 1);
    
    // Pick type (Unused in current Egg logic but kept for reference)
    const rand = Math.random();
    let type = EggType.NORMAL;
    if (rand > 0.9) type = EggType.GOLD; // 10% Gold
    else if (rand > 0.7) type = EggType.CRACKED; // 20% Cracked

    // Create egg with dummy ramps/duration to satisfy constructor, then activate
    // Note: Spawner seems to be legacy code compared to EggMovementSystem
    const egg = new Egg(this.scene, null as any, lane, 1000);
    this.group.add(egg);
    
    // Set speed based on difficulty
    egg.activate(this.difficulty.getEggSpeed(time));
  }
}
