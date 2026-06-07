import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { InventorySystem } from '../systems/InventorySystem';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { GameRegistry } from '../core/GameRegistry';

const logger = Logger.forSystem('HUD');

export class HUDScene extends Phaser.Scene {
  static readonly KEY = 'HUDScene';

  private playerSystem!: PlayerSystem;
  private inventorySystem!: InventorySystem;

  private hpBg!: Phaser.GameObjects.Graphics;
  private hpFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;

  private resBg!: Phaser.GameObjects.Graphics;
  private resFill!: Phaser.GameObjects.Graphics;
  private resText!: Phaser.GameObjects.Text;

  private xpBg!: Phaser.GameObjects.Graphics;
  private xpFill!: Phaser.GameObjects.Graphics;
  private xpText!: Phaser.GameObjects.Text;

  private potionSlots: Phaser.GameObjects.Graphics[] = [];
  private goldText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: HUDScene.KEY });
  }

  init(data: { playerSystem: PlayerSystem; inventorySystem: InventorySystem }): void {
    this.playerSystem = data.playerSystem;
    this.inventorySystem = data.inventorySystem;
  }

  create(): void {
    const depth = 200100;

    // HP bar background + fill
    this.hpBg = this.add.graphics().setScrollFactor(0).setDepth(depth);
    this.drawBarBg(this.hpBg, 680, 1010, 240, 36);

    this.hpFill = this.add.graphics().setScrollFactor(0).setDepth(depth + 1);

    this.hpText = this.add.text(800, 1028, '', {
      color: '#cccccc', fontSize: '14px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // Resource bar background + fill
    this.resBg = this.add.graphics().setScrollFactor(0).setDepth(depth);
    this.drawBarBg(this.resBg, 1000, 1010, 240, 36);

    this.resFill = this.add.graphics().setScrollFactor(0).setDepth(depth + 1);

    this.resText = this.add.text(1120, 1028, '', {
      color: '#cccccc', fontSize: '14px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // XP bar background + fill (centered, below HP/RES)
    this.xpBg = this.add.graphics().setScrollFactor(0).setDepth(depth);
    this.drawBarBg(this.xpBg, 960 - 230, 1050, 460, 20);

    this.xpFill = this.add.graphics().setScrollFactor(0).setDepth(depth + 1);

    this.xpText = this.add.text(960, 1060, '', {
      color: '#aaaaaa', fontSize: '12px', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 2);

    // Potion belt — 5 empty slots
    for (let i = 0; i < 5; i++) {
      const sx = 1280 + i * 32;
      const slot = this.add.graphics().setScrollFactor(0).setDepth(depth);
      this.drawPotionSlot(slot, sx, 1016);
      this.potionSlots.push(slot);
    }

    // Gold display (to the right of potion belt)
    this.goldText = this.add.text(1320, 1056, '', {
      color: '#c9a84c', fontSize: '12px', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(depth + 1);

    logger.info('HUD created');
  }

  update(): void {
    const player = this.playerSystem.getPlayer();
    const resourceColors = this.getResourceColors();

    const hpRatio = player.maxHealth > 0 ? player.health / player.maxHealth : 0;
    this.drawFill(this.hpFill, 680, 1010, 240, 36, hpRatio, 0xff5555, 0x991111);
    this.hpText.setText(`HP: ${player.health}/${player.maxHealth}`);

    const resRatio = player.maxResource > 0 ? player.resource / player.maxResource : 0;
    this.drawFill(this.resFill, 1000, 1010, 240, 36, resRatio, resourceColors.light, resourceColors.dark);
    const resName = player.resourceType.toUpperCase();
    this.resText.setText(`${resName}: ${player.resource}/${player.maxResource}`);

    const xpRatio = player.experienceToNext > 0 ? player.experience / player.experienceToNext : 0;
    this.drawFill(this.xpFill, 960 - 230, 1050, 460, 20, xpRatio, 0xffdd44, 0x885500);
    this.xpText.setText(`Lv.${player.level}  ${player.experience}/${player.experienceToNext} XP`);

    this.goldText.setText(`Gold: ${this.inventorySystem.getGold()}`);
  }

  private drawBarBg(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x + 2, y + 2, w, h, 4);
    g.fillStyle(0x0d0d0d);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x333333);
    g.strokeRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x1a1a1a);
    g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 4);
  }

  private drawFill(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number,
                   ratio: number, lightColor: number, darkColor: number): void {
    const fillW = Math.round(w * Math.max(0, Math.min(1, ratio)));
    g.clear();
    if (fillW <= 0) return;
    g.fillStyle(darkColor);
    g.fillRoundedRect(x, y, fillW, h, 4);
    g.fillStyle(lightColor, 0.6);
    g.fillRoundedRect(x, y, fillW, h / 2, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(x + 4, y + 2, fillW - 8, 2);
  }

  private drawPotionSlot(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.clear();
    const size = 28;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x + 2, y + 2, size, size, 3);
    g.fillStyle(0x0d0d0d);
    g.fillRoundedRect(x, y, size, size, 3);
    g.lineStyle(1, 0x1a1a2e);
    g.strokeRoundedRect(x, y, size, size, 3);
    g.fillStyle(0x050505);
    g.fillRoundedRect(x + 3, y + 3, size - 6, size - 6, 2);
  }

  private getResourceColors(): { light: number; dark: number } {
    const player = this.playerSystem.getPlayer();
    switch (player.resourceType) {
      case 'rage': return { light: 0xee5500, dark: 0x771100 };
      case 'stamina': return { light: 0x55cc44, dark: 0x115511 };
      default: return { light: 0x4488ff, dark: 0x113388 };
    }
  }
}
