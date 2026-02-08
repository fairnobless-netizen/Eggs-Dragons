
import Phaser from 'phaser';

type EventHandler = (...args: any[]) => void;

class GameEventEmitter {
  private events: Phaser.Events.EventEmitter;

  constructor() {
    this.events = new Phaser.Events.EventEmitter();
  }

  // React -> Phaser
  emitInput(laneIndex: number) {
    this.events.emit('INPUT_LANE', laneIndex);
  }

  emitGameMode(mode: 'A' | 'B') {
    this.events.emit('GAME_MODE', mode);
  }

  emitPause() {
    this.events.emit('PAUSE_TOGGLE');
  }

  emitDifficultyUp() {
    this.events.emit('DIFFICULTY_UP');
  }

  emitBoost(type: string) {
    this.events.emit('ACTIVATE_BOOST', type);
  }

  // Phaser -> React
  onScoreUpdate(callback: (score: number) => void) {
    this.events.on('SCORE_UPDATE', callback);
    return () => this.events.off('SCORE_UPDATE', callback);
  }

  onLivesUpdate(callback: (lives: number) => void) {
    this.events.on('LIVES_UPDATE', callback);
    return () => this.events.off('LIVES_UPDATE', callback);
  }

  onGameOver(callback: () => void) {
    this.events.on('GAME_OVER', callback);
    return () => this.events.off('GAME_OVER', callback);
  }

  // Internal Helpers
  emit(event: string, ...args: any[]) {
    this.events.emit(event, ...args);
  }

  on(event: string, fn: EventHandler) {
    this.events.on(event, fn);
  }
  
  off(event: string, fn: EventHandler) {
    this.events.off(event, fn);
  }
}

export const GameEvents = new GameEventEmitter();
