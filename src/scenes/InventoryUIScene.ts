import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { InventorySystem } from '../systems/InventorySystem';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { GameRegistry } from '../core/GameRegistry';

const logger = Logger.forSystem('INVENTORY_UI');

export class InventoryUIScene extends Phaser.Scene {
  static readonly KEY = 'InventoryUIScene';

  private inventorySystem!: InventorySystem;
  private playerSystem!: PlayerSystem;
  private registry!: GameRegistry;

  private inventoryVisible = false;
  private characterVisible = false;
  private lastKeyTime = 0;

  constructor() {
    super({ key: InventoryUIScene.KEY });
  }

  init(data: { inventorySystem: InventorySystem; playerSystem: PlayerSystem; registry: GameRegistry }): void {
    this.inventorySystem = data.inventorySystem;
    this.playerSystem = data.playerSystem;
    this.registry = data.registry;
    this.inventoryVisible = false;
    this.characterVisible = false;
  }

  create(): void {
    this.setupInput();
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      const now = performance.now();
      if (now - this.lastKeyTime < 100) return;
      this.lastKeyTime = now;

      if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        this.toggleInventory();
      }
      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        this.toggleCharacter();
      }
    });
  }

  private toggleInventory(): void {
    this.inventoryVisible = !this.inventoryVisible;
    this.updatePause();
    logger.info('Inventory toggled', { visible: this.inventoryVisible });
  }

  private toggleCharacter(): void {
    this.characterVisible = !this.characterVisible;
    this.updatePause();
    logger.info('Character sheet toggled', { visible: this.characterVisible });
  }

  private updatePause(): void {
    const gameScene = this.scene.get('GameScene');
    if (this.inventoryVisible || this.characterVisible) {
      gameScene.scene.pause();
    } else {
      gameScene.scene.resume();
    }
  }
}
