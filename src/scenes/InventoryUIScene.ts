import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { InventorySystem } from '../systems/InventorySystem';
import { getRarityColor } from '../entities/Item';
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

  private inventoryBg!: Phaser.GameObjects.Rectangle;
  private inventoryTitle!: Phaser.GameObjects.Text;
  private slotRects: Phaser.GameObjects.Rectangle[] = [];
  private itemRects: Phaser.GameObjects.Rectangle[] = [];
  private itemLabels: Phaser.GameObjects.Text[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private closeHint!: Phaser.GameObjects.Text;

  private static readonly PANEL_W = 700;
  private static readonly PANEL_H = 560;
  private static readonly SLOT_SIZE = 52;
  private static readonly SLOT_GAP = 4;
  private static readonly GRID_ORIGIN_X = 822;
  private static readonly GRID_ORIGIN_Y = 320;

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
    this.createInventoryPanel();
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
    this.inventoryBg.setVisible(this.inventoryVisible);
    this.inventoryTitle.setVisible(this.inventoryVisible);
    this.goldText.setVisible(this.inventoryVisible);
    this.closeHint.setVisible(this.inventoryVisible);
    for (const s of this.slotRects) s.setVisible(this.inventoryVisible);
    if (this.inventoryVisible) {
      this.renderInventory();
    } else {
      for (const r of this.itemRects) r.destroy();
      for (const l of this.itemLabels) l.destroy();
      this.itemRects = [];
      this.itemLabels = [];
    }
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

  private createInventoryPanel(): void {
    const cx = 960;
    const cy = 540;
    const px = cx - InventoryUIScene.PANEL_W / 2;
    const py = cy - InventoryUIScene.PANEL_H / 2;

    this.inventoryBg = this.add.rectangle(cx, cy, InventoryUIScene.PANEL_W, InventoryUIScene.PANEL_H, 0x0d0d0d, 0.95)
      .setScrollFactor(0).setDepth(200000).setVisible(false)
      .setStrokeStyle(1, 0x1a1a2e);

    this.inventoryTitle = this.add.text(cx, py + 24, 'INVENTORY', {
      color: '#cccccc', fontSize: '24px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);

    const gx = InventoryUIScene.GRID_ORIGIN_X;
    const gy = InventoryUIScene.GRID_ORIGIN_Y;
    for (let row = 0; row < InventorySystem.ROWS; row++) {
      for (let col = 0; col < InventorySystem.COLS; col++) {
        const x = gx + col * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
        const y = gy + row * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
        const slot = this.add.rectangle(
          x + InventoryUIScene.SLOT_SIZE / 2,
          y + InventoryUIScene.SLOT_SIZE / 2,
          InventoryUIScene.SLOT_SIZE,
          InventoryUIScene.SLOT_SIZE,
          0x0d0d0d, 1,
        ).setScrollFactor(0).setDepth(200002).setStrokeStyle(1, 0x1a1a2e).setVisible(false);
        this.slotRects.push(slot);
      }
    }

    this.goldText = this.add.text(cx, py + InventoryUIScene.PANEL_H - 50, '', {
      color: '#c9a84c', fontSize: '18px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);

    this.closeHint = this.add.text(cx, py + InventoryUIScene.PANEL_H - 24, 'Press I to close', {
      color: '#555555', fontSize: '14px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);
  }

  private renderInventory(): void {
    this.goldText.setText(`Gold: ${this.inventorySystem.getGold()}`);

    for (const r of this.itemRects) r.destroy();
    for (const l of this.itemLabels) l.destroy();
    this.itemRects = [];
    this.itemLabels = [];

    const gx = InventoryUIScene.GRID_ORIGIN_X;
    const gy = InventoryUIScene.GRID_ORIGIN_Y;
    const slots = this.inventorySystem.getInventorySlots();
    const seen = new Set<string>();

    for (let row = 0; row < InventorySystem.ROWS; row++) {
      for (let col = 0; col < InventorySystem.COLS; col++) {
        const item = slots[row * InventorySystem.COLS + col];
        if (!item || seen.has(item.id)) continue;
        seen.add(item.id);
        const sx = gx + col * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
        const sy = gy + row * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
        const sw = item.gridW * InventoryUIScene.SLOT_SIZE + (item.gridW - 1) * InventoryUIScene.SLOT_GAP;
        const sh = item.gridH * InventoryUIScene.SLOT_SIZE + (item.gridH - 1) * InventoryUIScene.SLOT_GAP;

        const color = getRarityColor(item.rarity);
        const rect = this.add.rectangle(
          sx + sw / 2, sy + sh / 2, sw, sh, color, 0.85,
        ).setScrollFactor(0).setDepth(200003).setVisible(true).setStrokeStyle(1, color);

        const label = this.add.text(sx + sw / 2, sy + sh + 2, item.name, {
          color: '#cccccc', fontSize: '10px', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200004).setVisible(true);

        this.itemRects.push(rect);
        this.itemLabels.push(label);
      }
    }
  }
}
