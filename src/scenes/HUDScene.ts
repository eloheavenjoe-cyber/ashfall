import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { InventorySystem } from '../systems/InventorySystem';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { SkillSystem } from '../systems/SkillSystem';

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
  private skillSystem!: SkillSystem;
  private skillSlots: Phaser.GameObjects.Graphics[] = [];
  private skillIconRects: { g: Phaser.GameObjects.Graphics; x: number; y: number }[] = [];
  private skillHotkeyTexts: Phaser.GameObjects.Text[] = [];
  private skillCostTexts: Phaser.GameObjects.Text[] = [];
  private skillCdTexts: Phaser.GameObjects.Text[] = [];
  private skillNameTexts: Phaser.GameObjects.Text[] = [];
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipName!: Phaser.GameObjects.Text;
  private tooltipDesc!: Phaser.GameObjects.Text;
  private tooltipCd!: Phaser.GameObjects.Text;
  private tooltipCost!: Phaser.GameObjects.Text;
  private hoveredSlotIndex: number = -1;

  constructor() {
    super({ key: HUDScene.KEY });
  }

  init(data: { playerSystem: PlayerSystem; inventorySystem: InventorySystem; skillSystem: SkillSystem }): void {
    this.playerSystem = data.playerSystem;
    this.inventorySystem = data.inventorySystem;
    this.skillSystem = data.skillSystem;
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

    this.createSkillBar();

    logger.info('HUD created');
  }

  update(): void {
    this.updateSkillBar();
    this.updateTooltip();
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

  private getSkillTypeColor(skillType: string): number {
    switch (skillType) {
      case 'melee': return 0xff4444;
      case 'ranged': return 0x44cc44;
      case 'aoe':
      case 'aoe_target': return 0xdd8800;
      case 'buff': return 0x4444ff;
      case 'mobility': return 0x44ffff;
      case 'channeled': return 0xcc44cc;
      default: return 0x888888;
    }
  }

  private getSlotX(i: number): number {
    const slotWidths = [140, 64, 64, 64, 64];
    const gap = 8;
    const totalWidth = slotWidths.reduce((a, b) => a + b, 0) + gap * 4;
    let startX = 960 - totalWidth / 2;
    for (let j = 0; j < i; j++) startX += slotWidths[j] + gap;
    return startX;
  }

  private getSlotWidth(i: number): number {
    const slotWidths = [140, 64, 64, 64, 64];
    return slotWidths[i];
  }

  private getSkillCostColor(resourceType: string): string {
    switch (resourceType) {
      case 'rage': return '#ee5500';
      case 'stamina': return '#55cc44';
      default: return '#4488ff';
    }
  }

  private createSkillBar(): void {
    const depth = 200100;
    const slotH = 56;
    const gap = 8;
    const slotWidths = [140, 64, 64, 64, 64];
    const labels = ['LMB', 'Q', 'E', 'R', 'F'];
    const totalWidth = slotWidths.reduce((a, b) => a + b, 0) + gap * 4;
    let startX = 960 - totalWidth / 2;

    for (let i = 0; i < 5; i++) {
      const w = slotWidths[i];
      const x = startX;
      const y = 1080;

      const slot = this.add.graphics().setScrollFactor(0).setDepth(depth);
      this.drawSkillSlotBg(slot, x, y, w, slotH);
      this.skillSlots.push(slot);

      const iconG = this.add.graphics().setScrollFactor(0).setDepth(depth + 1);
      this.skillIconRects.push({ g: iconG, x: x + 8, y: y + 8 });

      const hotkey = this.add.text(x + w - 10, y + slotH - 12, labels[i], {
        color: '#aaaaaa', fontSize: '10px', fontFamily: 'monospace',
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(depth + 2);
      this.skillHotkeyTexts.push(hotkey);

      const costText = this.add.text(x + 8, y + slotH - 10, '', {
        color: '#aaaaaa', fontSize: '8px', fontFamily: 'monospace',
      }).setOrigin(0, 1).setScrollFactor(0).setDepth(depth + 2);
      this.skillCostTexts.push(costText);

      const cdText = this.add.text(x + w / 2, y + slotH / 2, '', {
        color: '#ffffff', fontSize: '13px', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 3);
      this.skillCdTexts.push(cdText);

      const nameText = this.add.text(x + w / 2, y + 4, '', {
        color: '#cccccc', fontSize: '9px', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 2);
      this.skillNameTexts.push(nameText);

      startX += w + gap;
    }

    // Tooltip objects (initially hidden)
    this.tooltipBg = this.add.graphics().setScrollFactor(0).setDepth(depth + 10).setVisible(false);
    this.tooltipName = this.add.text(0, 0, '', {
      color: '#ffffff', fontSize: '14px', fontFamily: 'monospace', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(depth + 11).setVisible(false);
    this.tooltipDesc = this.add.text(0, 0, '', {
      color: '#aaaaaa', fontSize: '12px', fontFamily: 'monospace', wordWrap: { width: 200 },
    }).setScrollFactor(0).setDepth(depth + 11).setVisible(false);
    this.tooltipCd = this.add.text(0, 0, '', {
      color: '#cccccc', fontSize: '12px', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(depth + 11).setVisible(false);
    this.tooltipCost = this.add.text(0, 0, '', {
      color: '#cccccc', fontSize: '12px', fontFamily: 'monospace',
    }).setScrollFactor(0).setDepth(depth + 11).setVisible(false);

    logger.info('Skill bar created');
  }

  private updateSkillBar(): void {
    const slots: Array<'basic' | 'q' | 'e' | 'r' | 'f'> = ['basic', 'q', 'e', 'r', 'f'];
    const player = this.playerSystem.getPlayer();

    for (let i = 0; i < 5; i++) {
      const skillSlot = slots[i];
      const skill = this.skillSystem.getSkillInSlot(skillSlot);
      const cooldown = this.skillSystem.getCooldown(skillSlot);
      const x = this.getSlotX(i);
      const w = this.getSlotWidth(i);
      const y = 1080;
      const h = 56;

      this.drawSkillSlotBg(this.skillSlots[i], x, y, w, h, this.hoveredSlotIndex === i);

      const iconG = this.skillIconRects[i].g;
      iconG.clear();

      if (skill) {
        const color = this.getSkillTypeColor(skill.skillType);
        iconG.fillStyle(color, 0.7);
        iconG.fillRoundedRect(this.skillIconRects[i].x, this.skillIconRects[i].y, w - 16, 30, 3);

        this.skillNameTexts[i].setText(skill.name);
        this.skillNameTexts[i].setVisible(true);

        const costColor = this.getSkillCostColor(player.resourceType);
        this.skillCostTexts[i].setText(`${skill.resourceCost}`);
        this.skillCostTexts[i].setColor(costColor);
        this.skillCostTexts[i].setVisible(true);

        if (cooldown > 0) {
          const cdRatio = skill.cooldown > 0 ? cooldown / skill.cooldown : 0;
          const overlayH = Math.round(h * cdRatio);
          this.skillSlots[i].fillStyle(0x000000, 0.6);
          this.skillSlots[i].fillRect(x, y, w, overlayH);
          this.skillCdTexts[i].setText(cooldown.toFixed(1));
          this.skillCdTexts[i].setVisible(true);
          this.skillNameTexts[i].setVisible(false);
        } else {
          this.skillCdTexts[i].setVisible(false);
          this.skillNameTexts[i].setVisible(true);
        }
      } else {
        iconG.fillStyle(0x1a1a1a);
        iconG.fillRoundedRect(this.skillIconRects[i].x, this.skillIconRects[i].y, w - 16, 30, 3);
        this.skillNameTexts[i].setVisible(false);
        this.skillCostTexts[i].setVisible(false);
        this.skillCdTexts[i].setVisible(false);
      }
    }

    this.hoveredSlotIndex = -1;
    const ptr = this.input.activePointer;
    for (let i = 0; i < 5; i++) {
      const x = this.getSlotX(i);
      const w = this.getSlotWidth(i);
      if (ptr.x >= x && ptr.x <= x + w && ptr.y >= 1080 && ptr.y <= 1080 + 56) {
        this.hoveredSlotIndex = i;
        break;
      }
    }
  }

  private drawSkillSlotBg(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, highlighted: boolean = false): void {
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x + 2, y + 2, w, h, 4);
    g.fillStyle(0x0d0d0d);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, highlighted ? 0x666666 : 0x333333);
    g.strokeRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x1a1a1a);
    g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 4);
  }

  private drawTooltipBg(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x + 2, y + 2, w, h, 4);
    g.fillStyle(0x0d0d0d);
    g.fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x333333);
    g.strokeRoundedRect(x, y, w, h, 4);
  }

  private updateTooltip(): void {
    if (this.hoveredSlotIndex < 0) {
      this.tooltipBg.setVisible(false);
      this.tooltipName.setVisible(false);
      this.tooltipDesc.setVisible(false);
      this.tooltipCd.setVisible(false);
      this.tooltipCost.setVisible(false);
      return;
    }

    const i = this.hoveredSlotIndex;
    const slots: Array<'basic' | 'q' | 'e' | 'r' | 'f'> = ['basic', 'q', 'e', 'r', 'f'];
    const skill = this.skillSystem.getSkillInSlot(slots[i]);
    if (!skill) {
      this.tooltipBg.setVisible(false);
      this.tooltipName.setVisible(false);
      this.tooltipDesc.setVisible(false);
      this.tooltipCd.setVisible(false);
      this.tooltipCost.setVisible(false);
      return;
    }

    const player = this.playerSystem.getPlayer();
    const resourceName = player.resourceType.charAt(0).toUpperCase() + player.resourceType.slice(1);

    const slotX = this.getSlotX(i);
    const slotW = this.getSlotWidth(i);
    const tipX = slotX + slotW / 2;
    const tipW = 220;
    const tipH = 80;
    const tipY = 1080 - tipH - 4;

    this.tooltipBg.clear();
    this.tooltipBg.setVisible(true);
    this.drawTooltipBg(this.tooltipBg, tipX - tipW / 2, tipY, tipW, tipH);

    this.tooltipName.setPosition(tipX, tipY + 10).setText(skill.name).setVisible(true);
    this.tooltipDesc.setPosition(tipX, tipY + 28).setText(skill.description).setVisible(true);
    this.tooltipCd.setPosition(tipX, tipY + 54).setText(`Cooldown: ${skill.cooldown.toFixed(1)}s`).setVisible(true);
    this.tooltipCost.setPosition(tipX, tipY + 66).setText(`Cost: ${skill.resourceCost} ${resourceName}`)
      .setColor(this.getSkillCostColor(player.resourceType)).setVisible(true);
  }
}
