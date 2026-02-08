import Phaser from 'phaser';
import { GAME_CONFIG, RampPos } from '../../app/config';

export class RampsSystem {
  public tracks: Phaser.Curves.Line[] = [];
  private catchPoints: Record<RampPos, Phaser.Math.Vector2>;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Geometry must match the Phaser base size (see Game.ts scale.width/height).
    // If we hardcode 800 here while Phaser uses 1200, lanes will appear “centered”
    // and Right ramps won't stick to the right edge.
    this.configure();
  }

  public updateLayout(isFullscreen: boolean) {
    // Layout is static for this fix to ensure stability.
    // If fullscreen dynamic changes are needed later, add logic here.
    this.configure();
  }
private configure() {
  const w = GAME_CONFIG.WIDTH;
  const h = GAME_CONFIG.HEIGHT;

  // --- TUNING (angle + vertical offset) ---
  // Angle of ramps to match rocks (adjust if needed)
  // Smaller angle = flatter; bigger angle = steeper
  const rampAngleDeg = 16;

  // "A bit lower than the rock edge" (increase = move ramps down)
  const verticalOffset = 10;

  // Horizontal ramp length (same as before, keep mechanics stable)
  const rampWidthX = 280;

  // Gap between ramp end and dragon catch point
  const gapToCatch = 40;

  // Compute vertical rise from angle
  const rampRiseY = Math.tan(Phaser.Math.DegToRad(rampAngleDeg)) * rampWidthX;

  // Left Lane X
  const Lx_Start = 0;
  const Lx_End = rampWidthX;
  const Lx_Catch = Lx_End + gapToCatch;

  // Right Lane X
  const Rx_Start = w;
  const Rx_End = w - rampWidthX;
  const Rx_Catch = Rx_End - gapToCatch;

  // --- Y positions (base) ---
  // We keep two vertical "bands" (top + bottom), only changing the slope.
  // StartY is the "outer edge" Y (near screen edge), EndY rises toward center.
  const Top_Y_Start = 145 + verticalOffset;
  const Bot_Y_Start = 345 + verticalOffset;

  const Top_Y_End = Top_Y_Start + rampRiseY;
  const Bot_Y_End = Bot_Y_Start + rampRiseY;

  // Catch Y aligned with End Y (slight drop feels natural)
  const Catch_Y_Top = Top_Y_End + 10;
  const Catch_Y_Bot = Bot_Y_End + 10;

  this.tracks = [];
  this.catchPoints = {} as any;

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

  // Lane 2: Right Top (start at right edge -> end toward center)
  this.tracks[RampPos.RIGHT_TOP] = new Phaser.Curves.Line(
    new Phaser.Math.Vector2(Rx_Start, Top_Y_Start),
    new Phaser.Math.Vector2(Rx_End, Top_Y_End)
  );

  // Lane 3: Right Bot
  this.tracks[RampPos.RIGHT_BOT] = new Phaser.Curves.Line(
    new Phaser.Math.Vector2(Rx_Start, Bot_Y_Start),
    new Phaser.Math.Vector2(Rx_End, Bot_Y_End)
  );

  // Catch points for dragon landing / grabbing eggs
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
