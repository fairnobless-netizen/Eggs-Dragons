
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

  // Pick egg type (NEW PNG types)
  const rand = Math.random();
  let type = EggType.WHITE;

  // Проценты можно тюнить позже — сейчас важно убрать legacy NORMAL/CRACKED
  if (rand > 0.92) type = EggType.GOLD;          // ~8% gold
  else if (rand > 0.80) type = EggType.GREEN;    // ~12% green
  else if (rand > 0.68) type = EggType.BLUE;     // ~12% blue
  else if (rand > 0.60) type = EggType.SCALE;    // ~8% scale
  else if (rand > 0.52) type = EggType.GRENADE;  // ~8% grenade/bomb
  // else WHITE

  // Create egg with dummy ramps/duration to satisfy constructor, then activate
  const egg = new Egg(this.scene, null as any, lane, 1000);

  // IMPORTANT: use new EggType directly
  egg.setType(type);

  this.group.add(egg);

  // Set speed based on difficulty
  egg.activate(this.difficulty.getEggSpeed(time));
}

}
