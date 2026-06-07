import type Phaser from 'phaser';
import type { PlayerSystem } from '../../systems/PlayerSystem';
import type { EnemySystem } from '../../systems/EnemySystem';
import type { GameRegistry } from '../../core/GameRegistry';
import type { SkillConfig } from '../../data/dataConfigs';

export interface SkillContext {
  scene: Phaser.Scene;
  playerSystem: PlayerSystem;
  enemySystem: EnemySystem;
  registry: GameRegistry;
  skill: SkillConfig;
  playerX: number;
  playerY: number;
  aimAngle: number;
}

export interface SkillEffectHandler {
  readonly type: string;
  execute(ctx: SkillContext): void;
}
