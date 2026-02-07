
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PlayScene } from './scenes/PlayScene';

// GDX:
// - fullscreen_phone_transform: Phaser.Scale.FIT (Uniform scaling)
// - world_size_source: GAME_CONFIG (800x600)
// - render_mapping: Canvas viewport (via CSS removal)
// - input_mapping: Phaser Input Manager (Auto-scaled via FIT)
// - collision_space: World Coords (Unchanged, 800x600 logic)
// - ramp_endpoints_hint: RampsSystem.ts (Adjust offsets if edge-snapping needed later)
// - backend-relevant: NO

export const launchGame = (container: HTMLElement | string) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: container,
    transparent: true,
    physics: {
      default: 'arcade',
      arcade: { debug: false }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 800,
      height: 600
    },
    scene: [BootScene, PlayScene]
  };

  return new Phaser.Game(config);
};
