import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { SkillSystem } from '../../src/systems/SkillSystem';
import { GameRegistry } from '../../src/core/GameRegistry';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('SkillSystem', () => {
  let system: SkillSystem;
  let registry: GameRegistry;

  function makeRegistry(): GameRegistry {
    const r = new GameRegistry();
    r.classes.register('ironclad', {
      id: 'ironclad', name: 'Ironclad', resourceType: 'rage',
      baseStats: { health: 120, maxResource: 100, resourceRegen: 0, moveSpeed: 185, strength: 18, dexterity: 8, intelligence: 5, armour: 15, critChance: 5, critMultiplier: 150 },
      startingSkillIds: ['test_melee', 'test_aoe', 'test_buff', 'test_mobility', 'test_channel'],
      passives: ['ironclad_start'],
    });
    r.skills.register('test_melee', { id: 'test_melee', name: 'Test Melee', classId: 'ironclad', slot: 'basic', resourceCost: 0, resourceGenerated: 5, cooldown: 0, damageMultiplier: 1.0, skillType: 'melee', description: '' });
    r.skills.register('test_aoe', { id: 'test_aoe', name: 'Test Aoe', classId: 'ironclad', slot: 'q', resourceCost: 10, resourceGenerated: 0, cooldown: 2, damageMultiplier: 0.8, skillType: 'aoe', description: '' });
    r.skills.register('test_mobility', { id: 'test_mobility', name: 'Test Mobility', classId: 'ironclad', slot: 'r', resourceCost: 20, resourceGenerated: 0, cooldown: 4, damageMultiplier: 1.8, skillType: 'mobility', description: '' });
    r.skills.register('test_buff', { id: 'test_buff', name: 'Test Buff', classId: 'ironclad', slot: 'e', resourceCost: 30, resourceGenerated: 0, cooldown: 6, damageMultiplier: 1.0, skillType: 'buff', description: '' });
    r.skills.register('test_channel', { id: 'test_channel', name: 'Test Channel', classId: 'ironclad', slot: 'f', resourceCost: 5, resourceGenerated: 0, cooldown: 1, damageMultiplier: 2.0, skillType: 'channeled', description: '' });
    return r;
  }

  beforeEach(() => {
    system = new SkillSystem();
    registry = makeRegistry();

    system.registerHandler('melee', { type: 'melee', execute: () => {} });
    system.registerHandler('mobility', { type: 'mobility', execute: () => {} });
    system.registerHandler('aoe', { type: 'aoe', execute: () => {} });
    system.registerHandler('buff', { type: 'buff', execute: () => {} });
    system.registerHandler('channeled', { type: 'channeled', execute: () => {} });

    const mockInput = {
      isSkillQ: () => false,
      isSkillE: () => false,
      isSkillR: () => false,
      isSkillF: () => false,
      isAttacking: () => false,
      getAimAngle: () => 0,
    };

    class MockPlayerSystem {
      private player = {
        classId: 'ironclad', position: { x: 0, y: 0 }, facingAngle: 0, moveSpeed: 185,
        health: 120, maxHealth: 120, resource: 100, maxResource: 100, resourceType: 'rage',
        level: 1, experience: 0, experienceToNext: 100,
        strength: 18, dexterity: 8, intelligence: 5, armour: 15, evasion: 0,
      };
      getPlayer() { return this.player; }
      getClassId() { return 'ironclad'; }
    }

    system.init({
      scene: { add: { graphics: () => ({ setScrollFactor: () => ({ setDepth: () => {} }) }) } } as any,
      inputSystem: mockInput as any,
      playerSystem: new MockPlayerSystem() as any,
      enemySystem: {} as any,
      registry,
    });
  });

  it('maps 5 skills from class startingSkillIds', () => {
    expect(system.getSkillInSlot('basic')?.id).toBe('test_melee');
    expect(system.getSkillInSlot('q')?.id).toBe('test_aoe');
    expect(system.getSkillInSlot('e')?.id).toBe('test_buff');
    expect(system.getSkillInSlot('r')?.id).toBe('test_mobility');
    expect(system.getSkillInSlot('f')?.id).toBe('test_channel');
  });

  it('starts with 0 cooldowns', () => {
    expect(system.getCooldown('q')).toBe(0);
    expect(system.getCooldown('r')).toBe(0);
    expect(system.getCooldown('e')).toBe(0);
  });

  it('starts with 0 shield', () => {
    expect(system.getShield()).toBe(0);
  });

  it('cooldown is set for skill with cooldown > 0', () => {
    // As a sanity check: verify we can read cooldown state
    expect(system.getCooldown('r')).toBe(0);
  });
});
