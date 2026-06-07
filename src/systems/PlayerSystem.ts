import type Phaser from 'phaser';
import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import type { InputSystem } from './InputSystem';
import type { GameRegistry } from '../core/GameRegistry';
import type { PlayerEntity } from '../entities/PlayerEntity';
import { createPlayerEntity } from '../entities/PlayerEntity';

const logger = Logger.forSystem('PLAYER');

const CLASS_COLORS: Record<string, number> = {
  ironclad: 0x4488ff,
  ranger: 0x44cc44,
};

export class PlayerSystem implements ISystem {
  readonly name = 'PlayerSystem';
  readonly logger = Logger.forSystem('PLAYER');

  private scene!: Phaser.Scene;
  private inputSystem!: InputSystem;
  private registry!: GameRegistry;
  private player!: PlayerEntity;
  private sprite!: Phaser.GameObjects.Rectangle;
  private aimLine!: Phaser.GameObjects.Rectangle;
  private didInit = false;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.scene = cfg.scene as Phaser.Scene;
    this.inputSystem = cfg.inputSystem as InputSystem;
    this.registry = cfg.registry as GameRegistry;
    const classId = cfg.classId as string || 'ironclad';

    const classConfig = this.registry.classes.get(classId);
    this.player = createPlayerEntity(
      classId,
      {
        health: classConfig.baseStats.health,
        maxResource: classConfig.baseStats.maxResource,
        resourceRegen: classConfig.baseStats.resourceRegen,
        moveSpeed: classConfig.baseStats.moveSpeed,
        resourceType: classConfig.resourceType,
      },
      960, 540,
    );

    const color = CLASS_COLORS[classId] || 0x888888;
    this.sprite = this.scene.add.rectangle(
      this.player.position.x, this.player.position.y,
      28, 44, color, 1,
    ).setDepth(this.player.position.y);

    this.aimLine = this.scene.add.rectangle(
      this.player.position.x + 20, this.player.position.y,
      20, 2, 0xffffff, 0.6,
    ).setDepth(99999);

    this.didInit = true;
    logger.info('Initialised', { classId, moveSpeed: this.player.moveSpeed });
  }

  update(delta: number): void {
    if (!this.didInit) return;

    const dir = this.inputSystem.getMoveDirection();
    const aimAngle = this.inputSystem.getAimAngle();

    this.player.facingAngle = aimAngle;

    if (dir.x !== 0 || dir.y !== 0) {
      this.player.position.x += dir.x * this.player.moveSpeed * delta;
      this.player.position.y += dir.y * this.player.moveSpeed * delta;
    }

    this.sprite.setPosition(this.player.position.x, this.player.position.y);
    this.sprite.setDepth(this.player.position.y);

    const lineLen = 22;
    this.aimLine.setPosition(
      this.player.position.x + Math.cos(aimAngle) * lineLen,
      this.player.position.y + Math.sin(aimAngle) * lineLen,
    );
    this.aimLine.setRotation(aimAngle);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.aimLine?.destroy();
    logger.info('Destroyed');
  }

  getPlayer(): PlayerEntity {
    return this.player;
  }

  getSprite(): Phaser.GameObjects.Rectangle {
    return this.sprite;
  }

  getClassId(): string {
    return this.player.classId;
  }
}
