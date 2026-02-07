
import Phaser from 'phaser';
import { GAME_CONFIG, RampPos } from '../../app/config';

export class RampsSystem {
  public tracks: Phaser.Curves.Line[] = [];
  private catchPoints: Record<RampPos, Phaser.Math.Vector2>;

  constructor(scene: Phaser.Scene) {
    // Fixed layout for 800x600 world.
    // Phaser.Scale.FIT handles the visual scaling to mobile screens.
    // We strictly define geometry within the logical game bounds.
    this.configure();
  }

  public updateLayout(isFullscreen: boolean) {
    // Layout is static for this fix to ensure stability.
    // If fullscreen dynamic changes are needed later, add logic here.
    this.configure();
  }

  private configure() {
    const w = GAME_CONFIG.WIDTH; // 800
    const h = GAME_CONFIG.HEIGHT; // 600

    // GEOMETRY CONFIGURATION
    // Ramps start at the very edges of the world (0 and 800) to anchor to the DeviceShell.
    // They end closer to the center to feed the dragon.

    const rampWidthX = 280; // Horizontal length of the ramp
    const gapToCatch = 40;  // Gap between ramp end and dragon catch point

    // Left Lane Coordinates
    const Lx_Start = 0;
    const Lx_End = rampWidthX;
    const Lx_Catch = Lx_End + gapToCatch;

    // Right Lane Coordinates
    const Rx_Start = w;
    const Rx_End = w - rampWidthX;
    const Rx_Catch = Rx_End - gapToCatch;

    // Y Coordinates (Symmetric for Left/Right)
    const Top_Y_Start = 130;
    const Top_Y_End = 260;
    
    const Bot_Y_Start = 330;
    const Bot_Y_End = 460;

    // Catch Y aligned with End Y for smooth transition
    const Catch_Y_Top = Top_Y_End + 10; // Slight drop for gravity feel
    const Catch_Y_Bot = Bot_Y_End + 10;

    this.tracks = [];
    this.catchPoints = {} as any;

    // Define Lines (Start -> End)
    // Lane 0: Left Top
    this.tracks[RampPos.LEFT_TOP] = new Phaser.Curves.Line(
      new Phaser.Math.Vector2(Lx_Start, Top_Y_Start),
      new Phaser.Math.Vector2(Lx_End, Top_Y_End)
    );
    // Lane 1: Left Bot
    this.tracks[RampPos.LEFT_BOT] = new Phaser.Curves.Line(
      new Phaser.Math.Vector2(Lx_Start, Bot_Y_Start),
      new Phaser.Math.Vector2(Lx_End, Bot_Y_End)
    );
    // Lane 2: Right Top
    this.tracks[RampPos.RIGHT_TOP] = new Phaser.Curves.Line(
      new Phaser.Math.Vector2(Rx_Start, Top_Y_Start),
      new Phaser.Math.Vector2(Rx_End, Top_Y_End)
    );
    // Lane 3: Right Bot
    this.tracks[RampPos.RIGHT_BOT] = new Phaser.Curves.Line(
      new Phaser.Math.Vector2(Rx_Start, Bot_Y_Start),
      new Phaser.Math.Vector2(Rx_End, Bot_Y_End)
    );

    // Define Catch Points (Dragon Position)
    this.catchPoints = {
      [RampPos.LEFT_TOP]: new Phaser.Math.Vector2(Lx_Catch, Catch_Y_Top),
      [RampPos.LEFT_BOT]: new Phaser.Math.Vector2(Lx_Catch, Catch_Y_Bot),
      [RampPos.RIGHT_TOP]: new Phaser.Math.Vector2(Rx_Catch, Catch_Y_Top),
      [RampPos.RIGHT_BOT]: new Phaser.Math.Vector2(Rx_Catch, Catch_Y_Bot),
    };
  }

  getPosition(lane: RampPos, t: number): Phaser.Math.Vector2 {
    return this.tracks[lane].getPoint(t);
  }

  getPoint(lane: RampPos, t: number): Phaser.Math.Vector2 {
    return this.getPosition(lane, t);
  }

  getRampEndPoint(lane: RampPos): Phaser.Math.Vector2 {
    return this.tracks[lane].p1;
  }

  getDragonCatchPosition(lane: RampPos): Phaser.Math.Vector2 {
    return this.catchPoints[lane];
  }

  drawDebug(graphics: Phaser.GameObjects.Graphics) {
    graphics.lineStyle(4, 0x00ff00, 0.5); 
    this.tracks.forEach(track => track.draw(graphics));
    
    graphics.fillStyle(0xff0000, 0.5);
    Object.values(this.catchPoints).forEach(p => {
      graphics.fillCircle(p.x, p.y, 8);
    });
  }
}
