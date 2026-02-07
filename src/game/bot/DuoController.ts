
import { gameBridge } from '../../app/gameBridge';
import { ApiClient } from '../../net/apiClient';
import { StorageService } from '../../app/storage';

class DuoController {
  private isActive: boolean = false;
  private partnerName: string = "Partner";
  
  private friendLives: number = 3;
  private friendScore: number = 0;
  private localPlayerScore: number = 0;
  
  private listeners: Array<() => void> = [];
  private tickInterval: any = null;

  public startMatch(partnerName: string) {
    this.stopMatch();
    this.isActive = true;
    this.partnerName = partnerName;
    this.friendLives = 3;
    this.friendScore = 0;
    this.localPlayerScore = 0;

    console.log(`[Duo] Match started with ${partnerName}`);

    // Hook listeners
    this.listeners.push(gameBridge.on('UI_SCORE', (s) => this.onPlayerScore(s)));
    this.listeners.push(gameBridge.on('UI_GAME_OVER', (finalScore) => this.onGameOver(finalScore)));
    this.listeners.push(gameBridge.on('UI_LIVES', (l) => { /* Track lives if needed for shared pool logic */ }));
    
    // Start simulation tick (Friend scores periodically)
    this.tickInterval = setInterval(() => this.tick(), 1500);
    this.emitState();
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
    // Friend roughly matches player performance with some variance
    const diff = Math.floor(Math.random() * 50);
    this.friendScore = Math.max(0, Math.floor(playerScore * 0.9) + diff);
    this.emitState();
  }

  private tick() {
      // Occasional independent score bump for friend
      if (Math.random() > 0.6) {
          this.friendScore += 50;
          this.emitState();
      }
      // Occasional life loss simulation
      if (Math.random() > 0.95 && this.friendLives > 0) {
          this.friendLives--;
          this.emitState();
      }
  }

  private emitState() {
    gameBridge.emit('UI_OPPONENT_UPDATE', {
        name: this.partnerName,
        score: this.friendScore,
        lives: this.friendLives,
        isBot: false
    });
  }

  private onGameOver(finalLocalScore: number) {
    if (!this.isActive) return;
    
    // Total Duo Score
    const totalScore = finalLocalScore + this.friendScore;
    const profile = StorageService.getProfile();

    console.log(`[Duo] Game Over. Total: ${totalScore}`);

    // Submit to Duo Leaderboard
    ApiClient.submitScore(
        totalScore, 
        undefined, 
        profile.username, 
        'duo', 
        this.partnerName
    );
    
    this.stopMatch();
  }
}

export const duoController = new DuoController();
