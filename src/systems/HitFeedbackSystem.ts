import type Phaser from 'phaser';
import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { EnemySystem } from './EnemySystem';

const logger = Logger.forSystem('HIT_FB');

export class HitFeedbackSystem implements ISystem {
  readonly name = 'HitFeedbackSystem';
  readonly logger = Logger.forSystem('HIT_FB');

  private scene!: Phaser.Scene;
  private enemySystem!: EnemySystem;
  private didInit = false;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.scene = cfg.scene as Phaser.Scene;
    this.enemySystem = cfg.enemySystem as EnemySystem;

    EventBus.getInstance().on(GameEvent.COMBAT_HIT, this.onHit, this);
    EventBus.getInstance().on(GameEvent.COMBAT_KILL, this.onKill, this);
    EventBus.getInstance().on(GameEvent.COMBAT_PLAYER_HIT, this.onPlayerHit, this);

    this.didInit = true;
    logger.info('Initialised');
  }

  destroy(): void {
    EventBus.getInstance().offAll(this);
    logger.info('Destroyed');
  }

  update(_delta: number): void {}

  private onHit(payload: any): void {
    if (!payload) return;

    this.showDamageNumber(payload.hitPosition.x, payload.hitPosition.y, payload.damage, payload.isCrit);
    this.flashEnemy(payload.targetId);

    if (payload.isCrit) {
      this.shakeScreen(3, 120);
    } else {
      this.shakeScreen(1, 60);
    }
  }

  private onKill(payload: any): void {
    if (!payload) return;
    const deadSprite = this.findEnemySprite(payload.targetId);
    if (deadSprite) {
      this.deathBurst(deadSprite.x, deadSprite.y);
    }
  }

  private onPlayerHit(payload: any): void {
    if (!payload) return;
    this.showDamageNumber(
      payload.hitPosition.x - 30,
      payload.hitPosition.y - 10,
      payload.damage,
      false,
      '#ff3333',
    );
    this.shakeScreen(2, 80);
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean, customColor?: string): void {
    const color = customColor || (isCrit ? '#ffcc00' : '#ffffff');
    const fontSize = isCrit ? '18px' : '14px';
    const prefix = isCrit ? '!' : '';

    const text = this.scene.add.text(x, y - 10, `${prefix}${damage}`, {
      color,
      fontSize,
      fontFamily: 'monospace',
      fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(100000);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private flashEnemy(enemyId: string): void {
    const enemySprite = this.findEnemySprite(enemyId);
    if (!enemySprite) return;

    enemySprite.setFillStyle(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (enemySprite.active) {
        const es = this.enemySystem.getAliveEnemies().find((e) => e.sprite === enemySprite);
        if (es) {
          const colors: Record<string, number> = {
            hollow_husk: 0xcc3333,
            scabrous_rat: 0x886633,
            grave_archer: 0xcc8833,
          };
          enemySprite.setFillStyle(colors[es.entity.configId] || 0x888888);
        }
      }
    });
  }

  private shakeScreen(intensity: number, duration: number): void {
    this.scene.cameras.main.shake(duration, intensity / 1000);
  }

  private deathBurst(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.3;
      const particle = this.scene.add.rectangle(x, y, 4, 4, 0x888888, 1).setDepth(100001);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * (30 + Math.random() * 30),
        y: y + Math.sin(angle) * (30 + Math.random() * 30),
        alpha: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private findEnemySprite(enemyId: string): Phaser.GameObjects.Rectangle | null {
    const allEnemies = (this.enemySystem as any).enemySprites as { entity: { id: string }; sprite: Phaser.GameObjects.Rectangle }[] | undefined;
    if (!allEnemies) return null;
    const es = allEnemies.find((e) => e.entity.id === enemyId);
    return es?.sprite ?? null;
  }
}
