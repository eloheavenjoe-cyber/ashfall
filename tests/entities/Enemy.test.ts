import { describe, it, expect } from 'vitest';
import { createEnemy } from '../../src/entities/Enemy';
import type { EnemyConfig } from '../../src/data/dataConfigs';

const MOCK_CONFIG: EnemyConfig = {
  id: 'hollow_husk',
  name: 'Hollow Husk',
  tier: 'normal',
  attackType: 'melee',
  baseHP: 40,
  baseDamage: 8,
  moveSpeed: 60,
  detectionRadius: 5,
  attackRange: 1.5,
  xpReward: 10,
  lootTable: {
    goldDrop: { min: 5, max: 15 },
    itemDropChance: 0.2,
    itemTypeWeights: { weapon: 0.2, armour: 0.5, accessory: 0.2, currency: 0.1 },
  },
};

describe('createEnemy', () => {
  it('creates an enemy with correct stats from config', () => {
    const enemy = createEnemy(MOCK_CONFIG, 500, 600);
    expect(enemy.configId).toBe('hollow_husk');
    expect(enemy.health).toBe(40);
    expect(enemy.maxHealth).toBe(40);
    expect(enemy.damage).toBe(8);
    expect(enemy.moveSpeed).toBe(60);
    expect(enemy.attackRange).toBe(1.5);
    expect(enemy.detectionRadius).toBe(5);
    expect(enemy.xpReward).toBe(10);
  });

  it('sets initial position', () => {
    const enemy = createEnemy(MOCK_CONFIG, 100, 200);
    expect(enemy.position.x).toBe(100);
    expect(enemy.position.y).toBe(200);
  });

  it('initial state is idle', () => {
    const enemy = createEnemy(MOCK_CONFIG, 0, 0);
    expect(enemy.state).toBe('idle');
    expect(enemy.stateTimer).toBe(0);
    expect(enemy.attackCooldown).toBe(0);
  });

  it('generates a unique id', () => {
    const enemy1 = createEnemy(MOCK_CONFIG, 0, 0);
    const enemy2 = createEnemy(MOCK_CONFIG, 0, 0);
    expect(enemy1.id).not.toBe(enemy2.id);
  });

  it('sets a random wander angle', () => {
    const enemy1 = createEnemy(MOCK_CONFIG, 0, 0);
    const enemy2 = createEnemy(MOCK_CONFIG, 0, 0);
    // Very unlikely both random angles are exactly the same
    expect(enemy1.wanderAngle).not.toBe(enemy2.wanderAngle);
  });

  it('sets a non-negative wander timer', () => {
    const enemy = createEnemy(MOCK_CONFIG, 0, 0);
    expect(enemy.wanderTimer).toBeGreaterThanOrEqual(0);
  });
});
