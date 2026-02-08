
import { GAME_CONFIG } from '../../app/config';
import { TelegramService } from '../../app/telegram';
import { BoostsSystem } from './Boosts';

export class ScoringSystem {
  private score: number = 0;
  private lives: number = GAME_CONFIG.INITIAL_LIVES;
  private boosts: BoostsSystem;

  constructor(boosts: BoostsSystem, private onUpdate: (score: number, lives: number, combo: number) => void) {
      this.boosts = boosts;
  }

  addScore(points: number) {
    this.score += points;
    TelegramService.hapticImpact('light');
    this.notify();
  }

  loseLife() {
    // Check Shield
    if (this.boosts.consumeShield()) {
        TelegramService.hapticNotification('success'); // Shield saved us
        // Maybe play shield sound/effect
        return;
    }

    this.lives--;
    TelegramService.hapticNotification('error');
    this.notify();
    
    if (this.lives <= 0) {
       this.score = 0;
       this.lives = 3;
       this.notify();
       // In a real game, emit GAME_OVER here
    }
  }

  reset() {
      this.score = 0;
      this.lives = GAME_CONFIG.INITIAL_LIVES;
      this.notify();
  }

  private notify() {
    this.onUpdate(this.score, this.lives, 0);
  }
}
