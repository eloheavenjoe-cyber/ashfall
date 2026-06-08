import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { deserializeItem, serializeItem } from '../../src/core/saveHelpers';
import type { Item } from '../../src/entities/Item';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('saveHelpers', () => {
  it('serializes an Item to SerializedItem and back (round-trip)', () => {
    const item: Item = {
      id: 'test_item_001',
      baseTypeId: 'iron_plate',
      rarity: 'rare',
      name: 'Test Iron Plate',
      slot: 'body',
      subtype: 'armour',
      implicit: { statKey: 'armour', value: 5, label: '+5 Armour' },
      requirements: { strength: 25 },
      gridW: 2,
      gridH: 3,
      ilvl: 15,
      affixes: [{ affixId: 'test_prefix', value: 12, label: 'Test' }],
    };
    const serialized = serializeItem(item, 0, 0);
    expect(serialized.id).toBe('test_item_001');
    expect(serialized.rarity).toBe('rare');
    expect(serialized.subtype).toBe('armour');
    expect(serialized.implicit).toEqual({ statKey: 'armour', value: 5, label: '+5 Armour' });
    expect(serialized.requirements).toEqual({ strength: 25 });
    expect(serialized.originCol).toBe(0);
    expect(serialized.originRow).toBe(0);
    expect(serialized.affixes).toHaveLength(1);

    const deserialized = deserializeItem(serialized);
    expect(deserialized.id).toBe('test_item_001');
    expect(deserialized.rarity).toBe('rare');
    expect(deserialized.subtype).toBe('armour');
    expect(deserialized.implicit).toEqual({ statKey: 'armour', value: 5, label: '+5 Armour' });
    expect(deserialized.requirements).toEqual({ strength: 25 });
    expect(deserialized.affixes[0].affixId).toBe('test_prefix');
  });

  it('deserializes an item with no implicit or requirements', () => {
    const serialized = {
      id: 'i1', baseTypeId: 'copper_ring', rarity: 'normal' as const,
      name: 'Ring', slot: 'ring', subtype: 'ring',
      gridW: 1, gridH: 1, affixes: [], ilvl: 1,
      implicit: null, requirements: {},
      originCol: 3, originRow: 5,
    };
    const item = deserializeItem(serialized);
    expect(item.id).toBe('i1');
    expect(item.implicit).toBeNull();
    expect(item.requirements).toEqual({});
  });
});
