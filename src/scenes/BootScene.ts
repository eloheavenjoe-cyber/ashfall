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

  async create(): Promise<void> {
    logger.info('Boot sequence started');

    const registry = new GameRegistry();

    try {
      await loadAllData(registry as any);
      logger.info('Data loaded, starting game');
    } catch (err) {
      logger.fatal('Failed to load game data', { error: String(err) });
      this.showFatalError(err);
      return;
    }

    this.scene.start('GameScene', { registry });
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
