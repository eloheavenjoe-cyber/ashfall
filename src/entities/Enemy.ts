import type { EnemyConfig } from '../data/dataConfigs';

export type EnemyState = 'idle' | 'alert' | 'attack_windup' | 'attack_strike' | 'attack_cooldown' | 'dead';

export interface EnemyEntity {
  id: string;
  configId: string;
  health: number;
  maxHealth: number;
  damage: number;
  moveSpeed: number;
  attackRange: number;
  detectionRadius: number;
  position: { x: number; y: number };
  state: EnemyState;
  stateTimer: number;
  attackCooldown: number;
  wanderAngle: number;
  wanderTimer: number;
  xpReward: number;
}

export function createEnemy(config: EnemyConfig, x: number, y: number): EnemyEntity {
  return {
    id: `${config.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    configId: config.id,
    health: config.baseHP,
    maxHealth: config.baseHP,
    damage: config.baseDamage,
    moveSpeed: config.moveSpeed,
    attackRange: config.attackRange,
    detectionRadius: config.detectionRadius,
    position: { x, y },
    state: 'idle',
    stateTimer: 0,
    attackCooldown: 0,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: Math.random() * 3,
    xpReward: config.xpReward,
  };
}
