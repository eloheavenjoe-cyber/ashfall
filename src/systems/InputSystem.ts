import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type Phaser from 'phaser';

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

  init(config?: { scene: Phaser.Scene }): void {
    this.scene = config!.scene;
    const kb = this.scene.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
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
    this.state.aimAngle = Math.atan2(
      worldPoint.y - this.scene.cameras.main.scrollY - this.scene.cameras.main.height / 2,
      worldPoint.x - this.scene.cameras.main.scrollX - this.scene.cameras.main.width / 2
    );

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
}
