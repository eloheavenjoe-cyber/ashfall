import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { InventorySystem } from '../systems/InventorySystem';
import { getRarityColor, getRarityHtmlColor } from '../entities/Item';
import type { Item } from '../entities/Item';
import type { EquipmentSlotId } from '../systems/InventorySystem';
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

  private charBg!: Phaser.GameObjects.Rectangle;
  private charTitle!: Phaser.GameObjects.Text;
  private equipSlotRects: Phaser.GameObjects.Rectangle[] = [];
  private equipSlotLabels: Phaser.GameObjects.Text[] = [];
  private equipItemRects: Phaser.GameObjects.Rectangle[] = [];
  private equipItemLabels: Phaser.GameObjects.Text[] = [];
  private statsText!: Phaser.GameObjects.Text;
  private charCloseHint!: Phaser.GameObjects.Text;

  private dragState: {
    item: Item;
    originCol: number;
    originRow: number;
    ghost: Phaser.GameObjects.Rectangle | null;
    ghostLabel: Phaser.GameObjects.Text | null;
  } | null = null;

  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private tooltipText!: Phaser.GameObjects.Text;
  private hoveredItem: Item | null = null;

  private static readonly PANEL_W = 700;
  private static readonly PANEL_H = 560;
  private static readonly SLOT_SIZE = 52;
  private static readonly SLOT_GAP = 4;
  private static readonly GRID_ORIGIN_X = 822;
  private static readonly GRID_ORIGIN_Y = 320;

  private static readonly CHAR_PANEL_W = 500;
  private static readonly CHAR_PANEL_H = 580;
  private static readonly EQUIP_SLOT_SIZE = 64;
  private static readonly EQUIP_LEFT_X = 740;
  private static readonly EQUIP_RIGHT_X = 740 + 64 + 12;
  private static readonly EQUIP_START_Y = 310;
  private static readonly EQUIP_ROW_H = 92;
  private static readonly STATS_X = 910;
  private static readonly STATS_START_Y = 300;

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
    this.createCharacterPanel();
    this.createTooltip();
    this.setupInput();
    this.setupInventoryInput();
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
    this.hideTooltip();
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
    this.hideTooltip();
    this.characterVisible = !this.characterVisible;
    this.charBg.setVisible(this.characterVisible);
    this.charTitle.setVisible(this.characterVisible);
    this.statsText.setVisible(this.characterVisible);
    this.charCloseHint.setVisible(this.characterVisible);
    for (const s of this.equipSlotRects) s.setVisible(this.characterVisible);
    for (const l of this.equipSlotLabels) l.setVisible(this.characterVisible);
    if (this.characterVisible) {
      this.renderCharacter();
    } else {
      for (const r of this.equipItemRects) r.destroy();
      for (const l of this.equipItemLabels) l.destroy();
      this.equipItemRects = [];
      this.equipItemLabels = [];
    }
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

  private createCharacterPanel(): void {
    const cx = 960;
    const cy = 540;
    const py = cy - InventoryUIScene.CHAR_PANEL_H / 2;

    this.charBg = this.add.rectangle(cx, cy, InventoryUIScene.CHAR_PANEL_W, InventoryUIScene.CHAR_PANEL_H, 0x0d0d0d, 0.95)
      .setScrollFactor(0).setDepth(200000).setVisible(false)
      .setStrokeStyle(1, 0x1a1a2e);

    this.charTitle = this.add.text(cx, py + 24, 'CHARACTER', {
      color: '#cccccc', fontSize: '24px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);

    const slotIds = ['main_hand', 'off_hand', 'body', 'helm', 'gloves', 'boots', 'ring_1', 'ring_2', 'amulet', 'belt'];
    const slotLabels: Record<string, string> = {
      main_hand: 'Main Hand', off_hand: 'Off Hand', body: 'Body', helm: 'Helm',
      gloves: 'Gloves', boots: 'Boots', ring_1: 'Ring 1', ring_2: 'Ring 2',
      amulet: 'Amulet', belt: 'Belt',
    };

    for (let i = 0; i < slotIds.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? InventoryUIScene.EQUIP_LEFT_X : InventoryUIScene.EQUIP_RIGHT_X;
      const y = InventoryUIScene.EQUIP_START_Y + row * InventoryUIScene.EQUIP_ROW_H;

      const slot = this.add.rectangle(x, y, InventoryUIScene.EQUIP_SLOT_SIZE, InventoryUIScene.EQUIP_SLOT_SIZE, 0x0d0d0d, 1)
        .setScrollFactor(0).setDepth(200002).setStrokeStyle(1, 0x1a1a2e).setVisible(false);
      this.equipSlotRects.push(slot);

      const label = this.add.text(x, y + InventoryUIScene.EQUIP_SLOT_SIZE / 2 + 2, slotLabels[slotIds[i]], {
        color: '#666666', fontSize: '10px', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200003).setVisible(false);
      this.equipSlotLabels.push(label);
    }

    this.statsText = this.add.text(InventoryUIScene.STATS_X, InventoryUIScene.STATS_START_Y, '', {
      color: '#cccccc', fontSize: '14px', fontFamily: 'monospace', lineSpacing: 4,
    }).setScrollFactor(0).setDepth(200002).setVisible(false);

    this.charCloseHint = this.add.text(cx, py + InventoryUIScene.CHAR_PANEL_H - 24, 'Press C to close', {
      color: '#555555', fontSize: '14px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);
  }

  private renderCharacter(): void {
    for (const r of this.equipItemRects) r.destroy();
    for (const l of this.equipItemLabels) l.destroy();
    this.equipItemRects = [];
    this.equipItemLabels = [];

    const equipment = this.inventorySystem.getEquipment();
    const slotIds: string[] = ['main_hand', 'off_hand', 'body', 'helm', 'gloves', 'boots', 'ring_1', 'ring_2', 'amulet', 'belt'];

    for (let i = 0; i < slotIds.length; i++) {
      const slotId = slotIds[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? InventoryUIScene.EQUIP_LEFT_X : InventoryUIScene.EQUIP_RIGHT_X;
      const y = InventoryUIScene.EQUIP_START_Y + row * InventoryUIScene.EQUIP_ROW_H;
      const item = (equipment as Map<string, Item | null>).get(slotId) ?? null;

      if (item) {
        const color = getRarityColor(item.rarity);
        const rect = this.add.rectangle(x, y, InventoryUIScene.EQUIP_SLOT_SIZE, InventoryUIScene.EQUIP_SLOT_SIZE, color, 0.85)
          .setScrollFactor(0).setDepth(200003).setVisible(true).setStrokeStyle(2, color);
        this.equipItemRects.push(rect);

        const label = this.add.text(x, y + InventoryUIScene.EQUIP_SLOT_SIZE / 2 + 2, item.name, {
          color: '#cccccc', fontSize: '9px', fontFamily: 'monospace',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200004).setVisible(true);
        this.equipItemLabels.push(label);
      }
    }

    const player = this.playerSystem.getPlayer();
    const statsStr =
      `Level: ${player.level}\n` +
      `HP: ${player.health}/${player.maxHealth}\n` +
      `Resource: ${player.resource}/${player.maxResource}\n` +
      `\n` +
      `Str: ${player.strength}\n` +
      `Dex: ${player.dexterity}\n` +
      `Int: ${player.intelligence}\n` +
      `\n` +
      `Armour: ${player.armour}\n` +
      `Evasion: ${player.evasion}`;
    this.statsText.setText(statsStr);
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

  private createTooltip(): void {
    this.tooltipBg = this.add.rectangle(0, 0, 1, 1, 0x0d0d0d, 0.95)
      .setScrollFactor(0).setDepth(200010).setVisible(false).setStrokeStyle(1, 0x1a1a2e);
    this.tooltipText = this.add.text(0, 0, '', {
      color: '#cccccc', fontSize: '12px', fontFamily: 'monospace', lineSpacing: 2,
      wordWrap: { width: 260 },
    }).setScrollFactor(0).setDepth(200011).setVisible(false);
  }

  private showTooltip(item: Item, screenX: number, screenY: number): void {
    const lines: string[] = [];

    const rarityColor = getRarityHtmlColor(item.rarity);
    lines.push(item.name);
    lines.push(`${item.slot} ${item.subtype}`);
    lines.push('────────────────');

    if (item.implicit) {
      lines.push(item.implicit.label ?? `${item.implicit.statKey}: +${item.implicit.value}`);
    }

    for (const affix of item.affixes) {
      lines.push(affix.label ?? `${affix.affixId}: ${affix.value}`);
    }

    if (item.requirements && Object.keys(item.requirements).length > 0) {
      lines.push('────────────────');
      const player = this.playerSystem.getPlayer();
      for (const [stat, val] of Object.entries(item.requirements)) {
        const playerVal = (player as any)[stat] ?? 0;
        const mark = playerVal >= val ? '' : '⚠ ';
        lines.push(`${mark}Requires ${stat}: ${val}`);
      }
    }

    lines.push('────────────────');
    lines.push(`Item Level: ${item.ilvl}`);

    this.tooltipText.setText(lines.join('\n'));
    this.tooltipText.setColor('#cccccc');

    const pad = 8;
    const tw = this.tooltipText.width + pad * 2;
    const th = this.tooltipText.height + pad * 2;
    let tx = screenX + 16;
    let ty = screenY + 16;

    const cam = this.cameras.main;
    if (tx + tw > cam.width) tx = screenX - tw - 16;
    if (ty + th > cam.height) ty = screenY - th - 16;

    this.tooltipBg.setPosition(tx + tw / 2, ty + th / 2);
    this.tooltipBg.setSize(tw, th);
    this.tooltipText.setPosition(tx + pad, ty + pad);
    this.tooltipBg.setVisible(true);
    this.tooltipText.setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);
    this.hoveredItem = null;
  }

  private setupInventoryInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.inventoryVisible && !this.characterVisible) return;

      if (this.inventoryVisible) {
        const col = this.screenToGridCol(pointer.x);
        const row = this.screenToGridRow(pointer.y);
        if (col >= 0 && row >= 0) {
          const item = this.inventorySystem.getItemAtCell(col, row);
          if (item) {
            this.dragState = {
              item,
              originCol: col,
              originRow: row,
              ghost: null,
              ghostLabel: null,
            };
            this.inventorySystem.removeItem(item.id);
            this.renderInventory();
            return;
          }
        }
      }

      if (this.characterVisible && pointer.rightButtonDown()) {
        const slotId = this.screenToEquipSlot(pointer.x, pointer.y);
        if (slotId) {
          const item = (this.inventorySystem.getEquipment() as Map<string, Item | null>).get(slotId) ?? null;
          if (item) {
            this.dragState = {
              item,
              originCol: -1,
              originRow: -1,
              ghost: null,
              ghostLabel: null,
            };
            this.inventorySystem.unequipItem(slotId);
            this.renderCharacter();
            this.renderInventory();
          }
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragState) {
        if (!this.dragState.ghost) {
          this.dragState.ghost = this.add.rectangle(pointer.x, pointer.y, 32, 32, 0xffffff, 0.6)
            .setScrollFactor(0).setDepth(200020);
          this.dragState.ghostLabel = this.add.text(pointer.x, pointer.y + 18, this.dragState.item.name, {
            color: '#cccccc', fontSize: '10px', fontFamily: 'monospace',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(200021);
        } else {
          this.dragState.ghost.setPosition(pointer.x, pointer.y);
          if (this.dragState.ghostLabel) this.dragState.ghostLabel.setPosition(pointer.x, pointer.y + 18);
        }
        return;
      }

      if (this.inventoryVisible) {
        const col = this.screenToGridCol(pointer.x);
        const row = this.screenToGridRow(pointer.y);
        const item = (col >= 0 && row >= 0) ? this.inventorySystem.getItemAtCell(col, row) : null;
        if (item && item !== this.hoveredItem) {
          this.showTooltip(item, pointer.x, pointer.y);
          this.hoveredItem = item;
        } else if (!item && this.hoveredItem) {
          this.hideTooltip();
        }
      }

      if (this.characterVisible && !this.inventoryVisible) {
        const equipSlot = this.screenToEquipSlot(pointer.x, pointer.y);
        if (equipSlot) {
          const item = (this.inventorySystem.getEquipment() as Map<string, Item | null>).get(equipSlot) ?? null;
          if (item && item !== this.hoveredItem) {
            this.showTooltip(item, pointer.x, pointer.y);
            this.hoveredItem = item;
          } else if (!item && this.hoveredItem) {
            this.hideTooltip();
          }
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragState) return;

      if (this.dragState.ghost) this.dragState.ghost.destroy();
      if (this.dragState.ghostLabel) this.dragState.ghostLabel.destroy();

      const col = this.screenToGridCol(pointer.x);
      const row = this.screenToGridRow(pointer.y);
      const equipSlot = this.screenToEquipSlot(pointer.x, pointer.y);

      let placed = false;

      if (col >= 0 && row >= 0) {
        if (this.inventorySystem.canPlaceAt(this.dragState.item, col, row)) {
          this.inventorySystem.moveItem(this.dragState.item.id, col, row);
          placed = true;
        }
      } else if (equipSlot) {
        this.inventorySystem.addItem(this.dragState.item);
        const equipResult = this.inventorySystem.equipItem(this.dragState.item.id);
        placed = equipResult;
        if (!placed) {
          placed = true;
        }
      }

      if (!placed) {
        this.inventorySystem.addItem(this.dragState.item);
      }

      this.dragState = null;
      this.renderInventory();
      if (this.characterVisible) this.renderCharacter();
      this.hideTooltip();
    });
  }

  private screenToGridCol(sx: number): number {
    const gx = InventoryUIScene.GRID_ORIGIN_X;
    const cellSize = InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP;
    const col = Math.floor((sx - gx) / cellSize);
    if (col < 0 || col >= InventorySystem.COLS) return -1;
    return col;
  }

  private screenToGridRow(sy: number): number {
    const gy = InventoryUIScene.GRID_ORIGIN_Y;
    const cellSize = InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP;
    const row = Math.floor((sy - gy) / cellSize);
    if (row < 0 || row >= InventorySystem.ROWS) return -1;
    return row;
  }

  private screenToEquipSlot(sx: number, sy: number): EquipmentSlotId | null {
    const slotIds: EquipmentSlotId[] = ['main_hand', 'off_hand', 'body', 'helm', 'gloves', 'boots', 'ring_1', 'ring_2', 'amulet', 'belt'];
    for (let i = 0; i < slotIds.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? InventoryUIScene.EQUIP_LEFT_X : InventoryUIScene.EQUIP_RIGHT_X;
      const y = InventoryUIScene.EQUIP_START_Y + row * InventoryUIScene.EQUIP_ROW_H;
      const half = InventoryUIScene.EQUIP_SLOT_SIZE / 2;
      if (sx >= x - half && sx < x + half && sy >= y - half && sy < y + half) {
        return slotIds[i];
      }
    }
    return null;
  }
}
