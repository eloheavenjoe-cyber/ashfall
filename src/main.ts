import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { GameScene } from './scenes/GameScene';
import { DebugOverlayScene } from './scenes/DebugOverlayScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 1920,
  height: 1080,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  scene: [BootScene, MainMenuScene, ClassSelectScene, GameScene, DebugOverlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

new Phaser.Game(config);
