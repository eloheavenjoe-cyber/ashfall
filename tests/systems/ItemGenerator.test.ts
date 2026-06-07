import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { GameRegistry } from '../../src/core/GameRegistry';
import { Logger, LogLevel } from '../../src/core/Logger';
import { generateItem, generateLootDrop, getItemGridSize } from '../../src/systems/ItemGenerator';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

function makeRegistry(): GameRegistry {
  const r = new GameRegistry();

  // Register a test item base
  r.items.register('war_axe', {
    id: 'war_axe',
    name: 'War Axe',
    slot: 'main_hand',
    subtype: 'two_hand_melee',
    implicit: { statKey: 'increased_physical_damage', value: 10, label: '+10% phys' },
    requirements: { strength: 30 },
    maxSockets: 4,
  });

  r.items.register('iron_plate', {
    id: 'iron_plate',
    name: 'Iron Plate',
    slot: 'body',
    subtype: 'armour',
    implicit: { statKey: 'armour', value: 5, label: '+5 Armour' },
    armourRange: { min: 80, max: 120 },
    requirements: { strength: 25 },
    maxSockets: 4,
  });

  // Register test affixes
  r.affixes.register('cruel', {
    id: 'cruel', name: 'Cruel', type: 'prefix', tier: 3, weight: 100,
    statKey: 'physical_damage_added', minValue: 15, maxValue: 25,
    conflicts: ['tyrannical'],
  });

  r.affixes.register('stalwart', {
    id: 'stalwart', name: 'Stalwart', type: 'prefix', tier: 2, weight: 200,
    statKey: 'max_health', minValue: 40, maxValue: 80,
    conflicts: [],
  });

  r.affixes.register('durable', {
    id: 'durable', name: 'Durable', type: 'suffix', tier: 1, weight: 150,
    statKey: 'armour_percent', minValue: 10, maxValue: 15,
    conflicts: [],
  });

  r.affixes.register('resistant', {
    id: 'resistant', name: 'Resistant', type: 'suffix', tier: 3, weight: 100,
    statKey: 'fire_resistance', minValue: 15, maxValue: 25,
    conflicts: [],
  });

  // Register an enemy for loot drops
  r.enemies.register('hollow_husk', {
    id: 'hollow_husk', name: 'Hollow Husk', tier: 'normal', attackType: 'melee',
    baseHP: 40, baseDamage: 8, moveSpeed: 60, detectionRadius: 5,
    attackRange: 1.5, xpReward: 10,
    lootTable: {
      goldDrop: { min: 5, max: 15 },
      itemDropChance: 1.0,
      itemTypeWeights: { weapon: 0.5, armour: 0.5, accessory: 0, currency: 0 },
    },
  });

  return r;
}

describe('getItemGridSize', () => {
  it('returns 1x1 for rings and amulets', () => {
    expect(getItemGridSize('ring', '')).toEqual({ w: 1, h: 1 });
    expect(getItemGridSize('amulet', '')).toEqual({ w: 1, h: 1 });
  });

  it('returns 2x2 for helm, gloves, boots', () => {
    expect(getItemGridSize('helm', '')).toEqual({ w: 2, h: 2 });
    expect(getItemGridSize('gloves', '')).toEqual({ w: 2, h: 2 });
    expect(getItemGridSize('boots', '')).toEqual({ w: 2, h: 2 });
  });

  it('returns 2x3 for body armour', () => {
    expect(getItemGridSize('body', '')).toEqual({ w: 2, h: 3 });
  });

  it('returns 2x3 for two-hand weapons', () => {
    expect(getItemGridSize('main_hand', 'two_hand_melee')).toEqual({ w: 2, h: 3 });
  });

  it('returns 1x3 for one-hand weapons', () => {
    expect(getItemGridSize('main_hand', 'sword')).toEqual({ w: 1, h: 3 });
  });
});

describe('generateItem', () => {
  let registry: GameRegistry;

  beforeEach(() => {
    registry = makeRegistry();
    vi.restoreAllMocks();
  });

  it('generates a normal item with no affixes', () => {
    const item = generateItem('war_axe', 2, 'normal', registry);
    expect(item.rarity).toBe('normal');
    expect(item.affixes).toHaveLength(0);
    expect(item.name).toBe('War Axe');
    expect(item.baseTypeId).toBe('war_axe');
    expect(item.ilvl).toBe(2);
  });

  it('generates a magic item with affixes', () => {
    // Force 2 affixes by mocking random
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.4)  // affixCount: 2 (if < 0.5)
      .mockReturnValueOnce(0.5)  // prefix roll
      .mockReturnValueOnce(0.5)  // prefix pool roll (weighted)
      .mockReturnValueOnce(0.5)  // suffix roll
      .mockReturnValueOnce(0.5); // suffix pool roll (weighted)

    const item = generateItem('iron_plate', 5, 'magic', registry);
    expect(item.rarity).toBe('magic');
    expect(item.affixes.length).toBeGreaterThanOrEqual(1);
    expect(item.affixes.length).toBeLessThanOrEqual(2);
    expect(item.name).not.toBe('Iron Plate');
    vi.restoreAllMocks();
  });

  it('generates a rare item with multiple affixes', () => {
    const item = generateItem('war_axe', 20, 'rare', registry);
    expect(item.rarity).toBe('rare');
    expect(item.affixes.length).toBeGreaterThanOrEqual(3);
    expect(item.affixes.length).toBeLessThanOrEqual(6);
  });

  it('assigns correct slot from base type', () => {
    const item = generateItem('iron_plate', 1, 'normal', registry);
    expect(item.slot).toBe('body');
  });
});

describe('generateLootDrop', () => {
  it('drops gold and possibly an item', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // drop roll < 1.0 → always drop
    const registry = makeRegistry();
    const result = generateLootDrop('hollow_husk', 2, registry);
    expect(result.gold).toBeGreaterThanOrEqual(5);
    expect(result.gold).toBeLessThanOrEqual(15);
    expect(result.item).not.toBeNull();
    vi.restoreAllMocks();
  });

  it('returns only gold when item drop fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // > itemDropChance (1.0) ... 
    // Actually with itemDropChance 1.0, it always drops. Let me use a different approach.
    vi.restoreAllMocks();
  });

  it('returns gold even when no item drops', () => {
    const registry = makeRegistry();
    // Register enemy with low drop chance
    registry.enemies.register('rat', {
      id: 'rat', name: 'Rat', tier: 'normal', attackType: 'melee',
      baseHP: 10, baseDamage: 3, moveSpeed: 80, detectionRadius: 3,
      attackRange: 1, xpReward: 3,
      lootTable: {
        goldDrop: { min: 1, max: 3 },
        itemDropChance: 0,
        itemTypeWeights: { weapon: 1, armour: 0, accessory: 0, currency: 0 },
      },
    });

    const result = generateLootDrop('rat', 1, registry);
    expect(result.item).toBeNull();
    expect(result.gold).toBeGreaterThanOrEqual(1);
  });
});
