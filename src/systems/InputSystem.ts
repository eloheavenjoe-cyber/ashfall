import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type Phaser from 'phaser';
import type { PlayerSystem } from './PlayerSystem';

const logger = Logger.forSystem('INPUT');

export interface InputState {
  moveDirection: { x: number; y: number };
  aimWorldX: number;
  aimWorldY: number;
  aimAngle: number;
  isMoving: boolean;
}

export class InputSystem implements ISystem {
  readonly name = 'InputSystem';
  readonly logger = Logger.forSystem('INPUT');

  private scene!: Phaser.Scene;
  private playerSystem!: PlayerSystem;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private state: InputState = {
    moveDirection: { x: 0, y: 0 },
    aimWorldX: 0,
    aimWorldY: 0,
    aimAngle: 0,
    isMoving: false,
  };

  private lastDirX = 0;
  private lastDirY = 0;
  private attacking = false;
  private attackPressedThisFrame = false;

  init(config?: { scene: Phaser.Scene; playerSystem: PlayerSystem }): void {
    this.scene = config!.scene;
    this.playerSystem = config!.playerSystem;
    const kb = this.scene.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,Q,E,R,F') as Record<string, Phaser.Input.Keyboard.Key>;

    this.scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        EventBus.getInstance().emit(GameEvent.SAVE_TRIGGERED, { reason: 'manual' });
      }
    });

    logger.info('Initialised');
  }

  update(_delta: number): void {
    const dx = (this.keys.D.isDown ? 1 : 0) - (this.keys.A.isDown ? 1 : 0);
    const dy = (this.keys.S.isDown ? 1 : 0) - (this.keys.W.isDown ? 1 : 0);

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      this.state.moveDirection.x = dx / len;
      this.state.moveDirection.y = dy / len;
      this.state.isMoving = true;
    } else {
      this.state.moveDirection.x = 0;
      this.state.moveDirection.y = 0;
      this.state.isMoving = false;
    }

    const pointer = this.scene.input.activePointer;
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as { x: number; y: number };
    this.state.aimWorldX = worldPoint.x;
    this.state.aimWorldY = worldPoint.y;
    const playerPos = this.playerSystem.getPlayer().position;
    this.state.aimAngle = Math.atan2(
      worldPoint.y - playerPos.y,
      worldPoint.x - playerPos.x
    );

    const wasAttacking = this.attacking;
    this.attacking = pointer.leftButtonDown();
    this.attackPressedThisFrame = this.attacking && !wasAttacking;

    if (this.state.isMoving && (dx !== this.lastDirX || dy !== this.lastDirY)) {
      this.lastDirX = dx;
      this.lastDirY = dy;
      EventBus.getInstance().emit(GameEvent.PLAYER_MOVED, {
        direction: this.state.moveDirection,
        angle: this.state.aimAngle,
      });
    }
  }

  destroy(): void {
    this.keys = {};
    logger.info('Destroyed');
  }

  getState(): InputState {
    return this.state;
  }

  getMoveDirection(): { x: number; y: number } {
    return this.state.moveDirection;
  }

  getAimWorld(): { x: number; y: number } {
    return { x: this.state.aimWorldX, y: this.state.aimWorldY };
  }

  getAimAngle(): number {
    return this.state.aimAngle;
  }

  isSkillQ(): boolean { return this.keys.Q?.isDown ?? false; }
  isSkillE(): boolean { return this.keys.E?.isDown ?? false; }
  isSkillR(): boolean { return this.keys.R?.isDown ?? false; }
  isSkillF(): boolean { return this.keys.F?.isDown ?? false; }

  isAttacking(): boolean {
    return this.attacking;
  }

  wasAttackPressedThisFrame(): boolean {
    return this.attackPressedThisFrame;
  }
}
