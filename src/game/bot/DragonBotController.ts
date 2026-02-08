
import { gameBridge } from '../../app/gameBridge';
import { ApiClient } from '../../net/apiClient';
import { StorageService } from '../../app/storage';

class DragonBotController {
  private isActive: boolean = false;
  private botLives: number = 3;
  private botScore: number = 0;
  private playerLives: number = 3;
  private localPlayerScore: number = 0;
  
  private lifeDebt: number = 0;
  private tickInterval: any = null;
  private listeners: Array<() => void> = [];

  public startMatch() {
    this.stopMatch(); 
    this.isActive = true;
    this.botLives = 3; 
    this.botScore = 0;
    this.playerLives = 3; 
    this.localPlayerScore = 0;
    this.lifeDebt = 0;

    console.log('[DragonBot] Match started');

    this.listeners.push(gameBridge.on('UI_SCORE', (s) => this.onPlayerScore(s)));
    this.listeners.push(gameBridge.on('UI_LIVES', (l) => this.onPlayerLives(l)));
    this.listeners.push(gameBridge.on('UI_GAME_OVER', () => this.onGameOver()));
    
    this.tickInterval = setInterval(() => this.tick(), 1000);
  }

  public stopMatch() {
    if (!this.isActive) return;
    this.isActive = false;
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  private onPlayerScore(playerScore: number) {
    this.localPlayerScore = playerScore;
    this.botScore = Math.floor(playerScore * 0.7);
    this.emitState();
  }

  private onPlayerLives(currentLives: number) {
    if (currentLives < this.playerLives) {
        const lost = this.playerLives - currentLives;
        this.lifeDebt += lost * 0.5;
    } else if (currentLives > this.playerLives) {
        if (Math.random() < 0.3) {
            this.botLives++;
        }
    }
    this.playerLives = currentLives;
  }

  private tick() {
    if (!this.isActive) return;
    if (this.lifeDebt >= 1) {
        if (Math.random() < 0.4) {
            this.botLives--;
            this.lifeDebt -= 1;
            this.emitState();
        }
    }
  }

  private emitState() {
    gameBridge.emit('UI_OPPONENT_UPDATE', {
        name: 'DragonBot',
        score: this.botScore,
        lives: this.botLives,
        isBot: true
    });
  }

  private onGameOver() {
      if (!this.isActive) return;
      const totalScore = this.localPlayerScore + this.botScore;
      const profile = StorageService.getProfile();
      
      // Submit to Solo+Bot Leaderboard
      ApiClient.submitScore(totalScore, undefined, profile.username, 'solo_bot');
      
      this.stopMatch();
  }
}

export const dragonBot = new DragonBotController();
