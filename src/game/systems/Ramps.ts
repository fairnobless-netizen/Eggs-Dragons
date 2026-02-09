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
  // Source of truth: Phaser Scale base size (logical world).
  // Fallback to GAME_CONFIG if Scale is not ready yet.
  const w = (this.scene.scale as any)?.baseSize?.width ?? GAME_CONFIG.WIDTH;
  const h = (this.scene.scale as any)?.baseSize?.height ?? GAME_CONFIG.HEIGHT;

  const rampWidthX = 280; // Horizontal length of the ramp
  const gapToCatch = 40;  // Gap between ramp end and dragon catch point

  // Left Lane Coordinates (НЕ МЕНЯЕМ)
  const Lx_Start = 0;
  const Lx_End = rampWidthX;
  const Lx_Catch = Lx_End + gapToCatch;

  // Right Lane Coordinates (НЕ МЕНЯЕМ)
  const Rx_Start = w;
  const Rx_End = w - rampWidthX;
  const Rx_Catch = Rx_End - gapToCatch;

 // --- ANGLE TUNING (only Y changes) ---
// Раздельная настройка наклона: верх/низ независимо
// Пологий = меньше градусов
const topAngleDeg = 12;      // верхние рампы чуть положе
const bottomAngleDeg = 10;   // нижние рампы ещё положе

// "чуточку ниже кантика" (общий оффсет)
const verticalOffset = 28;

// Верхние рампы поднять выше (увеличь, если надо ещё выше)
const topLiftPx = 10;

// Нижние рампы опустить (оставляем твоё текущее значение)
const bottomExtraDrop = 48;

// Подъём по Y из угла (для заданной длины по X)
const topRiseY = Math.tan(Phaser.Math.DegToRad(topAngleDeg)) * rampWidthX;
const bottomRiseY = Math.tan(Phaser.Math.DegToRad(bottomAngleDeg)) * rampWidthX;

// Y Coordinates (Symmetric for Left/Right)
const Top_Y_Start = 130 + verticalOffset - topLiftPx;
const Top_Y_End = Top_Y_Start + topRiseY;

const Bot_Y_Start = 330 + verticalOffset + bottomExtraDrop;
const Bot_Y_End = Bot_Y_Start + bottomRiseY;

// Catch Y aligned with End Y for smooth transition
const Catch_Y_Top = Top_Y_End + 10;
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
