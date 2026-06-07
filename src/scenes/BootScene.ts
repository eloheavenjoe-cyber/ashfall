import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { GameRegistry } from '../core/GameRegistry';
import { loadAllData } from '../core/dataLoader';

const logger = Logger.forSystem('BOOT');

export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super({ key: BootScene.KEY });
  }

  create(): void {
    logger.info('Boot sequence started');

    this.cameras.main.setBackgroundColor('#0a0a0a');
    const loadingText = this.add.text(960, 540, 'Loading...', {
      color: '#888888',
      fontSize: '24px',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const registry = new GameRegistry();

    loadAllData(registry as any)
      .then(() => {
        logger.info('Data loaded, starting menu');
        loadingText.destroy();
        this.scene.start('MainMenuScene', { registry });
      })
      .catch((err) => {
        logger.fatal('Failed to load game data', { error: String(err) });
        loadingText.destroy();
        this.showFatalError(err);
      });
  }

  private showFatalError(err: unknown): void {
    const msg = `Failed to load game data:\n${String(err)}\n\nCheck that JSON files exist in /public/data/`;
    this.add.text(960, 540, msg, {
      color: '#ff4444',
      fontSize: '24px',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 800 },
    }).setOrigin(0.5);
  }
}
