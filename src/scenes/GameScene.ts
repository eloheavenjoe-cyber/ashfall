import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { SystemManager } from '../core/SystemManager';
import type { GameRegistry } from '../core/GameRegistry';
import { InputSystem } from '../systems/InputSystem';
import { PlayerSystem } from '../systems/PlayerSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { CombatSystem } from '../systems/CombatSystem';
import { HitFeedbackSystem } from '../systems/HitFeedbackSystem';
import { LootSystem } from '../systems/LootSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { DebugOverlayScene } from './DebugOverlayScene';

const logger = Logger.forSystem('GAME');

export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  private gameRegistry!: GameRegistry;
  private classId!: string;
  private systemManager!: SystemManager;

  constructor() {
    super({ key: GameScene.KEY });
  }

  init(data: { registry: GameRegistry; classId: string }): void {
    this.gameRegistry = data.registry;
    this.classId = data.classId || 'ironclad';
    this.systemManager = new SystemManager();
  }

  create(): void {
    logger.info('Game scene creating', { classId: this.classId });

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(-Infinity, -Infinity, Infinity, Infinity);

    this.createIsometricGrid();

    const inputSystem = new InputSystem();
    const playerSystem = new PlayerSystem();
    const enemySystem = new EnemySystem();
    const combatSystem = new CombatSystem();
    const hitFeedbackSystem = new HitFeedbackSystem();
    const lootSystem = new LootSystem();
    const inventorySystem = new InventorySystem();

    this.systemManager.add(inputSystem);
    this.systemManager.add(playerSystem);
    this.systemManager.add(enemySystem);
    this.systemManager.add(combatSystem);
    this.systemManager.add(hitFeedbackSystem);
    this.systemManager.add(lootSystem);
    this.systemManager.add(inventorySystem);

    this.systemManager.initAll({
      scene: this,
      registry: this.gameRegistry,
      classId: this.classId,
      inputSystem,
      playerSystem,
      enemySystem,
      combatSystem,
      inventorySystem,
    });

    enemySystem.spawnEnemies(960, 540);

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
    this.gameRegistry = null as any;
  }

  private createIsometricGrid(): void {
    const COLS = 80;
    const ROWS = 80;
    const TILE_W = 64;
    const TILE_H = 32;
    const ORIGIN_X = 960;
    const ORIGIN_Y = 200;

    const g = this.add.graphics();
    g.setDepth(-100000);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const wx = (col - row) * (TILE_W / 2) + ORIGIN_X;
        const wy = (col + row) * (TILE_H / 2) + ORIGIN_Y;

        const shade = ((row + col) % 2 === 0) ? 0x2a2a2a : 0x333333;
        g.fillStyle(shade, 0.5);
        g.fillRect(wx - TILE_W / 2, wy - TILE_H / 2, TILE_W, TILE_H);
        g.lineStyle(1, 0x444444, 0.3);
        g.strokeRect(wx - TILE_W / 2, wy - TILE_H / 2, TILE_W, TILE_H);
      }
    }
  }
}
