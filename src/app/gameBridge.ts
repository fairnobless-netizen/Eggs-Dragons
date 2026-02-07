
import { RampPos, BoostType } from './config';
import { ControlLayout } from './storage';

type Listener = (data: any) => void;

class GameBridge {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, cb: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== cb);
  }

  emit(event: string, data?: any) {
    this.listeners[event]?.forEach(cb => cb(data));
  }

  // React -> Game
  setCatchPosition(pos: RampPos) { this.emit('G_MOVE_DRAGON', pos); }
  activateBoost(type: BoostType) { this.emit('G_ACTIVATE_BOOST', type); }
  toggleHard(isHard: boolean) { this.emit('G_SET_DIFFICULTY', isHard); }
  setFullscreen(isFull: boolean) { this.emit('G_FULLSCREEN', isFull); }
  notifyProfileUpdate() { this.emit('G_PROFILE_UPDATE'); }
  
  startGame() { this.emit('G_START_GAME'); } // Starts actual gameplay loop
  togglePause(paused: boolean) { 
    this.emit('G_SET_PAUSE', paused); 
    // Synchronize UI state whenever pause is toggled
    this.emit('UI_PAUSE_UPDATE', paused);
  }
  
  restartGame() { this.emit('G_RESTART'); }
  nextLevel() { this.emit('G_NEXT_LEVEL'); }
  exitGame() { this.emit('G_EXIT'); }
  updateSoundSettings(settings: { music: boolean, sfx: boolean, volume: number }) { this.emit('G_SOUND_UPDATE', settings); }

  // Game -> React
  updateScore(score: number) { this.emit('UI_SCORE', score); }
  updateTimer(time: number) { this.emit('UI_TIMER', time); }
  updateStars(stars: number) { this.emit('UI_STARS', stars); }
  updateLives(lives: number) { this.emit('UI_LIVES', lives); }
  setGameOver(score: number) { this.emit('UI_GAME_OVER', score); }
  setStageCleared(level: number) { this.emit('UI_STAGE_CLEARED', level); }
  updateLayout(layout: ControlLayout) { this.emit('UI_LAYOUT_UPDATE', layout); }
}

export const gameBridge = new GameBridge();
