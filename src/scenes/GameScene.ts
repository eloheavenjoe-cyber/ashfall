import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { SystemManager } from '../core/SystemManager';
import type { GameRegistry } from '../core/GameRegistry';

const logger = Logger.forSystem('GAME');

export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  private gameRegistry!: GameRegistry;
  private systemManager!: SystemManager;
  private tileMapGroup!: Phaser.GameObjects.Group;
  private playerSprite!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: GameScene.KEY });
  }

  init(data: { registry: GameRegistry }): void {
    this.gameRegistry = data.registry;
    this.systemManager = new SystemManager();
  }

  create(): void {
    logger.info('Game scene creating');

    this.systemManager.initAll();
    this.createIsometricGrid();
    this.createPlayer();
    this.setupCamera();
    this.systemManager.fireSceneReady();

    logger.info('Game scene ready');
  }

  update(time: number, delta: number): void {
    const deltaSec = delta / 1000;
    this.systemManager.updateAll(deltaSec);
    this.updateDepthSorting();
  }

  shutdown(): void {
    this.systemManager.destroyAll();
    this.gameRegistry = null as any;
  }

  private createIsometricGrid(): void {
    const TILE_W = 64;
    const TILE_H = 32;
    const COLS = 30;
    const ROWS = 30;
    const ORIGIN_X = 960;
    const ORIGIN_Y = 100;

    this.tileMapGroup = this.add.group();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const worldX = (col - row) * (TILE_W / 2) + ORIGIN_X;
        const worldY = (col + row) * (TILE_H / 2) + ORIGIN_Y;

        const shade = ((row + col) % 2 === 0) ? 0x2a2a2a : 0x333333;
        const tile = this.add.rectangle(worldX, worldY, TILE_W, TILE_H, shade, 0.5);

        tile.setStrokeStyle(1, 0x444444, 0.3);
        tile.setDepth(worldY);

        this.tileMapGroup.add(tile);
      }
    }
  }

  private createPlayer(): void {
    const startX = 960;
    const startY = 540;

    this.playerSprite = this.add.rectangle(startX, startY, 32, 48, 0x4488ff);
    this.playerSprite.setDepth(startY);
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    this.cameras.main.setBackgroundColor('#0a0a0a');
  }

  private updateDepthSorting(): void {
    this.playerSprite.setDepth(this.playerSprite.y);

    const tiles = this.tileMapGroup.getChildren() as Phaser.GameObjects.Rectangle[];
    for (const tile of tiles) {
      tile.setDepth(tile.y);
    }
  }
}
