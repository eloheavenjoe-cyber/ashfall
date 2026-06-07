import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import type { GameRegistry } from '../core/GameRegistry';
import type { ClassConfig } from '../data/dataConfigs';

const logger = Logger.forSystem('CLASS_SEL');

const GOLD = '#c8a84b';
const BONE = '#e8dcc8';
const GREY = '#666666';
const BG_COLOR = 0x0f0f0f;

const CLASS_COLORS: Record<string, number> = {
  ironclad: 0x4488ff,
  ranger: 0x44cc44,
};

const CLASS_FLAVOR: Record<string, string> = {
  ironclad: '"The world breaks against\nthem. They do not break."',
  ranger: '"The arrow was already in\nthe air before you knew\nshe was watching."',
};

export class ClassSelectScene extends Phaser.Scene {
  static readonly KEY = 'ClassSelectScene';

  private gameRegistry!: GameRegistry;
  private classes: ClassConfig[] = [];
  private selectedIndex = 0;
  private panels: Phaser.GameObjects.Container[] = [];
  private canInteract = false;

  constructor() {
    super({ key: ClassSelectScene.KEY });
  }

  init(data: { registry: GameRegistry }): void {
    this.gameRegistry = data.registry;
    this.classes = [];
    this.selectedIndex = 0;
    this.panels = [];
    this.canInteract = false;

    const ironclad = this.gameRegistry.classes.getOrNull('ironclad');
    const ranger = this.gameRegistry.classes.getOrNull('ranger');
    if (ironclad) this.classes.push(ironclad);
    if (ranger) this.classes.push(ranger);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG_COLOR);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, 80, 'Choose Your Class', {
      color: BONE,
      fontSize: '36px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const panelW = 340;
    const panelH = 420;
    const gap = 40;
    const totalW = this.classes.length * panelW + (this.classes.length - 1) * gap;
    const startX = cx - totalW / 2 + panelW / 2;

    this.classes.forEach((cls, i) => {
      const px = startX + i * (panelW + gap);
      const py = cy + 30;
      const container = this.createClassPanel(cls, i, px, py, panelW, panelH);
      this.panels.push(container);
    });

    this.add.text(cx, this.cameras.main.height - 60, '[A/D] Switch   [ENTER] Confirm   [ESC] Back', {
      color: GREY,
      fontSize: '14px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.highlightPanel(0);
    this.setupKeyboard();
    this.canInteract = true;
    logger.info('Class select ready');
  }

  private createClassPanel(cls: ClassConfig, index: number, x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x1a1a1a, 0.9).setStrokeStyle(2, 0x333333);
    container.add(bg);

    const name = cls.name.toUpperCase();
    container.add(this.add.text(0, -h / 2 + 30, name, {
      color: CLASS_COLORS[cls.id] === 0x4488ff ? '#4488ff' : '#44cc44',
      fontSize: '22px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const avatar = this.add.rectangle(0, -h / 2 + 90, 60, 60, CLASS_COLORS[cls.id] || 0x888888, 0.8);
    container.add(avatar);

    const stats = cls.baseStats;
    const lines = [
      `HP: ${stats.health}`,
      `Move: ${stats.moveSpeed}`,
      `Resource: ${cls.resourceType.toUpperCase()}`,
      `STR: ${stats.strength}  DEX: ${stats.dexterity}`,
    ];
    const statText = this.add.text(-w / 2 + 30, -h / 2 + 140, lines.join('\n'), {
      color: BONE,
      fontSize: '14px',
      fontFamily: 'monospace',
      lineSpacing: 4,
    });
    container.add(statText);

    const flavor = CLASS_FLAVOR[cls.id] || '';
    const flavorText = this.add.text(0, h / 2 - 80, flavor, {
      color: GREY,
      fontSize: '12px',
      fontFamily: 'monospace',
      align: 'center',
      lineSpacing: 2,
    }).setOrigin(0.5);
    container.add(flavorText);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.selectClass(index);
    });
    bg.on('pointerover', () => {
      if (this.canInteract) {
        this.selectedIndex = index;
        this.highlightPanel(index);
      }
    });

    return container;
  }

  private highlightPanel(index: number): void {
    this.panels.forEach((container, i) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === index ? 0xc8a84b : 0x333333);
    });
  }

  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (!this.canInteract) return;

      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.highlightPanel(this.selectedIndex);
      }

      if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        this.selectedIndex = Math.min(this.classes.length - 1, this.selectedIndex + 1);
        this.highlightPanel(this.selectedIndex);
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.selectClass(this.selectedIndex);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.canInteract = false;
        this.scene.start('MainMenuScene', { registry: this.gameRegistry });
      }
    });
  }

  private selectClass(index: number): void {
    if (!this.canInteract) return;
    this.canInteract = false;
    const cls = this.classes[index];
    logger.info('Class selected', { classId: cls.id, name: cls.name });
    this.scene.start('GameScene', { registry: this.gameRegistry, classId: cls.id });
  }
}
