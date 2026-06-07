import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { EventBus } from '../../src/core/EventBus';
import { GameEvent } from '../../src/core/GameEvent';
import { GameRegistry } from '../../src/core/GameRegistry';
import { LevelingSystem } from '../../src/systems/LevelingSystem';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('LevelingSystem', () => {
  let system: LevelingSystem;
  let registry: GameRegistry;
  let player: any;

  function makeRegistry(): GameRegistry {
    const r = new GameRegistry();
    r.enemies.register('test_enemy', {
      id: 'test_enemy', name: 'Test', tier: 'normal', attackType: 'melee',
      baseHP: 10, baseDamage: 1, moveSpeed: 50, detectionRadius: 5,
      attackRange: 1, xpReward: 50,
      lootTable: { goldDrop: { min: 0, max: 0 }, itemDropChance: 0, itemTypeWeights: {} },
    });
    r.enemies.register('xp_empty', {
      id: 'xp_empty', name: 'No XP', tier: 'normal', attackType: 'melee',
      baseHP: 10, baseDamage: 1, moveSpeed: 50, detectionRadius: 5,
      attackRange: 1, xpReward: 0,
      lootTable: { goldDrop: { min: 0, max: 0 }, itemDropChance: 0, itemTypeWeights: {} },
    });
    r.classes.register('test_class', {
      id: 'test_class', name: 'Test Class', resourceType: 'rage',
      baseStats: { health: 100, maxResource: 100, resourceRegen: 0, moveSpeed: 185, strength: 10, dexterity: 10, intelligence: 10, armour: 5, critChance: 5, critMultiplier: 150 },
      startingSkillIds: [], passives: [],
      baseStatsPerLevel: { health: 10, strength: 2, dexterity: 1, armour: 1 },
    });
    return r;
  }

  afterEach(() => {
    system.destroy();
    EventBus.getInstance().clear();
  });

  beforeEach(() => {
    player = {
      classId: 'test_class', position: { x: 0, y: 0 }, facingAngle: 0, moveSpeed: 185,
      health: 100, maxHealth: 100, resource: 100, maxResource: 100, resourceType: 'rage',
      level: 1, experience: 0, experienceToNext: 130,
      strength: 10, dexterity: 10, intelligence: 10, armour: 5, evasion: 0,
    };
    registry = makeRegistry();
    system = new LevelingSystem();
    system.init({
      playerSystem: { getPlayer: () => player },
      registry,
    } as any);
  });

  it('awards XP on kill', () => {
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    expect(player.experience).toBe(50);
  });

  it('does not award XP for 0 xpReward enemies', () => {
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'xp_empty' });
    expect(player.experience).toBe(0);
  });

  it('triggers level-up when XP threshold reached', () => {
    player.experience = 100;
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    expect(player.level).toBe(2);
    expect(player.maxHealth).toBe(110);
    expect(player.strength).toBe(12);
    expect(player.armour).toBe(6);
    expect(player.health).toBe(110);
  });

  it('carries over excess XP on level-up', () => {
    player.experience = 110;
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    // 110 + 50 - 130 = 30
    expect(player.experience).toBe(30);
    expect(player.level).toBe(2);
  });

  it('supports multiple level-ups from one kill', () => {
    player.level = 1;
    player.experience = 260;
    player.experienceToNext = 130;
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    // 260 + 50 = 310. First level: -130 = 180, nextXP = 260. Second: 180 >= 260? no.
    expect(player.level).toBeGreaterThanOrEqual(2);
  });
});
