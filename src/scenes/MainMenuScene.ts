import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import type { GameRegistry } from '../core/GameRegistry';
import { SaveSystem } from '../systems/SaveSystem';

const logger = Logger.forSystem('MENU');

const BG_COLOR = 0x0a0a0a;
const GOLD = '#c8a84b';
const GREY = '#888888';
const BONE = '#e8dcc8';

interface MenuItem {
  label: string;
  action: string;
}

export class MainMenuScene extends Phaser.Scene {
  static readonly KEY = 'MainMenuScene';

  private gameRegistry!: GameRegistry;
  private selectedIndex = 0;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private canInteract = false;
  private menuItems: MenuItem[] = [];

  constructor() {
    super({ key: MainMenuScene.KEY });
  }

  init(data: { registry: GameRegistry }): void {
    this.gameRegistry = data.registry;
    this.selectedIndex = 0;
    this.menuTexts = [];
    this.canInteract = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG_COLOR);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 180, 'ASHFALL', {
      color: GOLD,
      fontSize: '64px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 110, 'A Dark Fantasy ARPG', {
      color: GREY,
      fontSize: '18px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 80, 'v1.0', {
      color: '#555555',
      fontSize: '14px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const menuItems: MenuItem[] = [
      { label: 'New Game', action: 'new_game' },
    ];
    if (SaveSystem.hasSave()) {
      menuItems.push({ label: 'Continue', action: 'continue' });
    }
    this.menuItems = menuItems;

    this.menuItems.forEach((item, i) => {
      const text = this.add.text(cx, cy + 30 + i * 50, `-- ${item.label} --`, {
        color: i === this.selectedIndex ? GOLD : GREY,
        fontSize: '24px',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      text.on('pointerover', () => {
        this.selectedIndex = i;
        this.highlightSelected();
      });

      text.on('pointerdown', () => {
        this.activateItem(i);
      });

      this.menuTexts.push(text);
    });

    this.add.text(cx, cy + 160, 'WASD to navigate | ENTER to select', {
      color: '#444444',
      fontSize: '13px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.setupKeyboard();
    this.canInteract = true;
    logger.info('Menu ready');
  }

  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (!this.canInteract) return;

      if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this.highlightSelected();
      }

      if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.menuItems.length;
        this.highlightSelected();
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.activateItem(this.selectedIndex);
      }
    });
  }

  private highlightSelected(): void {
    this.menuTexts.forEach((text, i) => {
      text.setColor(i === this.selectedIndex ? GOLD : GREY);
      text.setScale(i === this.selectedIndex ? 1.1 : 1);
    });
  }

  private activateItem(index: number): void {
    if (!this.canInteract) return;
    this.canInteract = false;

    const item = this.menuItems[index];
    logger.info('Menu item selected', { action: item.action });

    if (item.action === 'new_game') {
      this.scene.start('ClassSelectScene', { registry: this.gameRegistry });
    } else if (item.action === 'continue') {
      const saveData = SaveSystem.load();
      if (saveData) {
        this.scene.start('GameScene', { registry: this.gameRegistry, classId: saveData.character.classId, saveData });
      } else {
        const text = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 280,
          '-- Save corrupted or missing --',
          { color: '#ff6644', fontSize: '16px', fontFamily: 'monospace' },
        ).setOrigin(0.5);
        this.time.delayedCall(2000, () => { text.destroy(); this.canInteract = true; });
      }
    }
  }
}
