import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { SystemManager } from '../core/SystemManager';
import type { GameRegistry } from '../core/GameRegistry';
import { InputSystem } from '../systems/InputSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { DebugOverlayScene } from './DebugOverlayScene';

const logger = Logger.forSystem('GAME');

export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  private gameRegistry!: GameRegistry;
  private classId!: string;
  private systemManager!: SystemManager;
  private tileMapGroup!: Phaser.GameObjects.Group;

  constructor() {
    super({ key: GameScene.KEY });
  }

  init(data: { registry: GameRegistry; classId: string }): void {
    this.gameRegistry = data.registry;
    this.classId = data.classId || 'ironclad';
    this.systemManager = new SystemManager();
    this.tileMapGroup = this.add.group();
  }

  create(): void {
    logger.info('Game scene creating', { classId: this.classId });

    this.cameras.main.setBackgroundColor('#0a0a0a');

    this.createIsometricGrid();

    const inputSystem = new InputSystem();
    const playerSystem = new PlayerSystem();

    this.systemManager.add(inputSystem);
    this.systemManager.add(playerSystem);

    this.systemManager.initAll({
      scene: this,
      registry: this.gameRegistry,
      classId: this.classId,
      inputSystem,
    });

    this.systemManager.fireSceneReady();

    this.scene.launch(DebugOverlayScene.KEY);
    logger.info('Game scene ready');
  }

  update(_time: number, delta: number): void {
    const deltaSec = delta / 1000;
    this.systemManager.updateAll(deltaSec);
  }

  shutdown(): void {
    this.systemManager.destroyAll();
    this.tileMapGroup.clear(true, true);
    this.gameRegistry = null as any;
  }

  private createIsometricGrid(): void {
    const TILE_W = 64;
    const TILE_H = 32;
    const COLS = 40;
    const ROWS = 40;
    const ORIGIN_X = 960;
    const ORIGIN_Y = 200;

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
}
