
import Phaser from 'phaser';
import { GAME_CONFIG, BoostType } from '../../app/config';
import { soundService } from '../../app/sound';

export class BoostsSystem {
  private activeBoosts: Map<string, number> = new Map();
  private scene: Phaser.Scene;
  private shieldPulseCount: number = 0;

  public isTimeFrozen: boolean = false;
  public isMagnetActive: boolean = false;
  public isShieldActive: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  activate(type: BoostType, durationOverride?: number) {
    if (this.activeBoosts.has(type)) return; // Prevent stacking

    // Default durations per type if not overridden
    let defaultDuration = 10000; // Unified 10s for Boosts per spec

    const duration = durationOverride ?? defaultDuration;
    
    soundService.playBoost();
    
    this.activeBoosts.set(type, this.scene.time.now + duration);
    this.updateFlags();
    
    if (type === 'shield') {
      this.shieldPulseCount = 0;
    }
  }

  update(time: number) {
    let changed = false;
    for (const [key, endTime] of this.activeBoosts.entries()) {
      const remaining = endTime - time;
      
      // Handle Shield Pulses
      if (key === 'shield' && remaining <= 2000 && remaining > 0) {
        // Pulse at 5s and 6s (2s and 1s remaining)
        const expectedPulses = remaining < 1000 ? 2 : 1;
        if (this.shieldPulseCount < expectedPulses) {
          this.shieldPulseCount++;
          // Visuals handled in PlayScene, this is logic/audio trigger if needed
        }
      }

      if (time >= endTime) {
        this.activeBoosts.delete(key);
        changed = true;
      }
    }
    if (changed) this.updateFlags();
  }

  getRemainingTime(type: BoostType): number {
    const end = this.activeBoosts.get(type);
    return end ? Math.max(0, end - this.scene.time.now) : 0;
  }

  // Check if shield is active without consuming it (duration based)
  consumeShield(): boolean {
    return this.isShieldActive;
  }

  private updateFlags() {
    this.isTimeFrozen = this.activeBoosts.has('freeze');
    this.isMagnetActive = this.activeBoosts.has('magnet');
    this.isShieldActive = this.activeBoosts.has('shield');
  }

  reset() {
    this.activeBoosts.clear();
    this.updateFlags();
    this.shieldPulseCount = 0;
  }
}
