import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { InventorySystem } from '../../src/systems/InventorySystem';
import { GameRegistry } from '../../src/core/GameRegistry';
import { generateItem } from '../../src/systems/ItemGenerator';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('InventorySystem', () => {
  let system: InventorySystem;
  let registry: GameRegistry;

  function makeRegistry(): GameRegistry {
    const r = new GameRegistry();
    r.items.register('iron_plate', {
      id: 'iron_plate', name: 'Iron Plate', slot: 'body', subtype: 'armour',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.items.register('copper_ring', {
      id: 'copper_ring', name: 'Copper Ring', slot: 'ring', subtype: 'ring',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.items.register('war_axe', {
      id: 'war_axe', name: 'War Axe', slot: 'main_hand', subtype: 'two_hand_melee',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.affixes.register('test_prefix', {
      id: 'test_prefix', name: 'Test', type: 'prefix', tier: 1, weight: 100,
      statKey: 'armour', minValue: 10, maxValue: 20, conflicts: [],
    });
    return r;
  }

  beforeEach(() => {
    system = new InventorySystem();
    system.init({});
    registry = makeRegistry();
  });

  it('has 40 empty slots on init', () => {
    const slots = system.getInventorySlots();
    expect(slots.length).toBe(40);
    expect(slots.every(s => s === null)).toBe(true);
  });

  it('starts with empty equipment', () => {
    const eq = system.getEquipment();
    expect(eq.size).toBe(10);
    for (const v of eq.values()) {
      expect(v).toBeNull();
    }
  });

  it('starts with 0 gold', () => {
    expect(system.getGold()).toBe(0);
  });

  it('places a 1x1 item in slot 0', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    const added = system.addItem(item);
    expect(added).toBe(true);
    expect(system.getItemAtCell(0, 0)).toBe(item);
  });

  it('canPlaceAt returns false when cells are occupied', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const canPlace = system.canPlaceAt(item, 0, 0);
    expect(canPlace).toBe(false);
  });

  it('canPlaceAt returns true for empty cells', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    const canPlace = system.canPlaceAt(item, 1, 0);
    expect(canPlace).toBe(true);
  });

  it('places a 2x3 body item correctly', () => {
    const item = generateItem('iron_plate', 1, 'normal', registry);
    const added = system.addItem(item);
    expect(added).toBe(true);
    // Body items are 2x3 (gridW=2, gridH=3), occupying cells 0,1,5,6,10,11
    expect(system.getItemAtCell(0, 0)).toBe(item);
    expect(system.getItemAtCell(1, 0)).toBe(item);
    expect(system.getItemAtCell(0, 1)).toBe(item);
    expect(system.getItemAtCell(1, 1)).toBe(item);
    expect(system.getItemAtCell(0, 2)).toBe(item);
    expect(system.getItemAtCell(1, 2)).toBe(item);
  });

  it('canPlaceAt rejects out-of-bounds position', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    expect(system.canPlaceAt(item, -1, 0)).toBe(false);
    expect(system.canPlaceAt(item, 5, 0)).toBe(false);
    expect(system.canPlaceAt(item, 0, -1)).toBe(false);
    expect(system.canPlaceAt(item, 0, 8)).toBe(false);
  });

  it('canPlaceAt rejects if item extends beyond grid edge', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    expect(system.canPlaceAt(item, 4, 7)).toBe(true);
    expect(system.canPlaceAt(item, 5, 0)).toBe(false);
    expect(system.canPlaceAt(item, 0, 8)).toBe(false);

    const body = generateItem('iron_plate', 1, 'normal', registry);
    expect(system.canPlaceAt(body, 4, 0)).toBe(false);
    expect(system.canPlaceAt(body, 0, 7)).toBe(false);
    expect(system.canPlaceAt(body, 0, 6)).toBe(false);
    expect(system.canPlaceAt(body, 0, 5)).toBe(true);
  });

  it('fills all 40 slots with 1x1 items', () => {
    for (let i = 0; i < 40; i++) {
      const item = generateItem('copper_ring', 1, 'normal', registry);
      expect(system.addItem(item)).toBe(true);
    }
    const extra = generateItem('copper_ring', 1, 'normal', registry);
    expect(system.addItem(extra)).toBe(false);
  });

  it('removeItem removes item from grid', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const removed = system.removeItem(item.id);
    expect(removed).toBe(item);
    expect(system.getItemAtCell(0, 0)).toBeNull();
    const slots = system.getInventorySlots();
    expect(slots.every(s => s === null)).toBe(true);
  });

  it('moveItem moves item to new position', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const moved = system.moveItem(item.id, 2, 3);
    expect(moved).toBe(true);
    expect(system.getItemAtCell(0, 0)).toBeNull();
    expect(system.getItemAtCell(2, 3)).toBe(item);
  });

  it('moveItem returns false if target is blocked', () => {
    const item1 = generateItem('copper_ring', 1, 'normal', registry);
    const item2 = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item1);
    system.addItem(item2);
    const moved = system.moveItem(item1.id, 1, 0);
    expect(moved).toBe(false);
  });

  it('moveItem with multi-cell item allows shift that overlaps own cells', () => {
    const item = generateItem('iron_plate', 1, 'normal', registry);
    system.addItem(item);
    // At (0,0), shift right by 1 — overlaps original position
    const moved = system.moveItem(item.id, 1, 0);
    expect(moved).toBe(true);
    expect(system.getItemAtCell(0, 0)).toBeNull();
    expect(system.getItemAtCell(1, 0)).toBe(item);
  });

  it('removeItem with nonexistent id returns null', () => {
    const result = system.removeItem('nonexistent');
    expect(result).toBeNull();
  });

  it('removeItem preserves other items after removal', () => {
    const item1 = generateItem('copper_ring', 1, 'normal', registry);
    const item2 = generateItem('copper_ring', 1, 'normal', registry);
    const item3 = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item1);
    system.addItem(item2);
    system.addItem(item3);
    system.removeItem(item2.id);
    // item1 and item3 should still be there
    expect(system.getItemAtCell(0, 0)).toBe(item1);
    expect(system.getItemAtCell(1, 0)).toBeNull();
    expect(system.getItemAtCell(2, 0)).toBe(item3);
  });

  it('getItemAtCell returns null for out-of-bounds', () => {
    expect(system.getItemAtCell(-1, 0)).toBeNull();
    expect(system.getItemAtCell(5, 0)).toBeNull();
    expect(system.getItemAtCell(0, -1)).toBeNull();
    expect(system.getItemAtCell(0, 8)).toBeNull();
  });

  it('canPlaceAt respects correct column bounds for large items', () => {
    const body = generateItem('iron_plate', 1, 'normal', registry);
    // 2-wide item at col 4 → would extend to col 6 → out of bounds
    expect(system.canPlaceAt(body, 4, 0)).toBe(false);
    // 2-wide item at col 3 → cols 3 and 4 → valid
    expect(system.canPlaceAt(body, 3, 0)).toBe(true);
  });

  describe('equipment', () => {
    let eqSystem: InventorySystem;
    let eqRegistry: GameRegistry;

    function makeFullRegistry(): GameRegistry {
      const r = new GameRegistry();
      r.items.register('iron_plate', {
        id: 'iron_plate', name: 'Iron Plate', slot: 'body', subtype: 'armour',
        implicit: null, requirements: { strength: 25 }, maxSockets: 0,
      });
      r.items.register('copper_ring', {
        id: 'copper_ring', name: 'Copper Ring', slot: 'ring', subtype: 'ring',
        implicit: null, requirements: {}, maxSockets: 0,
      });
      r.items.register('war_axe', {
        id: 'war_axe', name: 'War Axe', slot: 'main_hand', subtype: 'two_hand_melee',
        implicit: null, requirements: { strength: 30 }, maxSockets: 0,
      });
      r.items.register('tower_shield', {
        id: 'tower_shield', name: 'Tower Shield', slot: 'off_hand', subtype: 'shield',
        implicit: null, requirements: {}, maxSockets: 0,
      });
      r.items.register('leather_belt', {
        id: 'leather_belt', name: 'Leather Belt', slot: 'belt', subtype: 'belt',
        implicit: null, requirements: {}, maxSockets: 0,
      });
      r.affixes.register('test_prefix', {
        id: 'test_prefix', name: 'Test', type: 'prefix', tier: 1, weight: 100,
        statKey: 'armour', minValue: 10, maxValue: 20, conflicts: [],
      });
      return r;
    }

    beforeEach(() => {
      eqSystem = new InventorySystem();
      eqSystem.init({});
      eqRegistry = makeFullRegistry();
    });

    it('equips body item to body slot', () => {
      const item = generateItem('iron_plate', 1, 'normal', eqRegistry);
      eqSystem.addItem(item);
      const result = eqSystem.equipItem(item.id);
      expect(result).toBe(true);
      expect(eqSystem.getEquipment().get('body')).toBe(item);
      expect(eqSystem.getItemAtCell(0, 0)).toBeNull();
    });

    it('unequipItem on empty slot returns false', () => {
      const result = eqSystem.unequipItem('off_hand');
      expect(result).toBe(false);
    });

    it('equipItem with item not in inventory returns false', () => {
      const result = eqSystem.equipItem('nonexistent_id');
      expect(result).toBe(false);
    });

    it('equipItem with unknown item slot returns false', () => {
      // Register a base with no valid slot mapping
      eqRegistry.items.register('test_scroll', {
        id: 'test_scroll', name: 'Test Scroll', slot: 'consumable', subtype: 'scroll',
        implicit: null, requirements: {}, maxSockets: 0,
      });
      const item = generateItem('test_scroll', 1, 'normal', eqRegistry);
      eqSystem.addItem(item);
      const result = eqSystem.equipItem(item.id);
      expect(result).toBe(false);
    });

    it('equips ring to ring_1 when ring_1 is empty', () => {
      const item = generateItem('copper_ring', 1, 'normal', eqRegistry);
      eqSystem.addItem(item);
      const result = eqSystem.equipItem(item.id);
      expect(result).toBe(true);
      expect(eqSystem.getEquipment().get('ring_1')).toBe(item);
      expect(eqSystem.getEquipment().get('ring_2')).toBeNull();
    });

    it('equips ring to ring_2 when ring_1 is occupied', () => {
      const ring1 = generateItem('copper_ring', 1, 'normal', eqRegistry);
      const ring2 = generateItem('copper_ring', 1, 'normal', eqRegistry);
      eqSystem.addItem(ring1);
      eqSystem.addItem(ring2);
      eqSystem.equipItem(ring1.id);
      const result = eqSystem.equipItem(ring2.id);
      expect(result).toBe(true);
      expect(eqSystem.getEquipment().get('ring_2')).toBe(ring2);
    });

    it('equipItem swaps ring_2 when both ring slots are occupied', () => {
      const ring1 = generateItem('copper_ring', 1, 'normal', eqRegistry);
      const ring2 = generateItem('copper_ring', 1, 'normal', eqRegistry);
      const ring3 = generateItem('copper_ring', 1, 'normal', eqRegistry);
      eqSystem.addItem(ring1);
      eqSystem.addItem(ring2);
      eqSystem.addItem(ring3);
      eqSystem.equipItem(ring1.id);
      eqSystem.equipItem(ring2.id);
      // ring3 should swap with ring_2 (last in targetSlots)
      const result = eqSystem.equipItem(ring3.id);
      expect(result).toBe(true);
      // ring2 should be back in inventory
      const slots = eqSystem.getInventorySlots();
      expect(slots.some(s => s?.id === ring2.id)).toBe(true);
      expect(eqSystem.getEquipment().get('ring_2')).toBe(ring3);
    });

    it('unequipItem moves item back to inventory', () => {
      const item = generateItem('copper_ring', 1, 'normal', eqRegistry);
      eqSystem.addItem(item);
      eqSystem.equipItem(item.id);
      const result = eqSystem.unequipItem('ring_1');
      expect(result).toBe(true);
      expect(eqSystem.getEquipment().get('ring_1')).toBeNull();
      const slots = eqSystem.getInventorySlots();
      expect(slots.some(s => s?.id === item.id)).toBe(true);
    });

    it('unequipItem fails when inventory is full', () => {
      const ring = generateItem('copper_ring', 1, 'normal', eqRegistry);
      eqSystem.addItem(ring);
      eqSystem.equipItem(ring.id);
      for (let i = 0; i < 40; i++) {
        eqSystem.addItem(generateItem('copper_ring', 1, 'normal', eqRegistry));
      }
      const result = eqSystem.unequipItem('ring_1');
      expect(result).toBe(false);
      expect(eqSystem.getEquipment().get('ring_1')).toBe(ring);
    });

    it('equipItem with occupied slot swaps items', () => {
      const body1 = generateItem('iron_plate', 1, 'normal', eqRegistry);
      const body2 = generateItem('iron_plate', 1, 'normal', eqRegistry);
      eqSystem.addItem(body1);
      eqSystem.addItem(body2);
      eqSystem.equipItem(body1.id);
      const result = eqSystem.equipItem(body2.id);
      expect(result).toBe(true);
      expect(eqSystem.getEquipment().get('body')).toBe(body2);
      const slots = eqSystem.getInventorySlots();
      expect(slots.some(s => s?.id === body1.id)).toBe(true);
    });

    it('addGold increases gold', () => {
      eqSystem.addGold(100);
      expect(eqSystem.getGold()).toBe(100);
      eqSystem.addGold(50);
      expect(eqSystem.getGold()).toBe(150);
    });

    it('addGold caps at 9,999,999', () => {
      eqSystem.addGold(10_000_000);
      expect(eqSystem.getGold()).toBe(9_999_999);
    });

    it('addGold ignores negative amounts', () => {
      eqSystem.addGold(100);
      eqSystem.addGold(-50);
      expect(eqSystem.getGold()).toBe(100);
    });

    it('equips belt item to belt slot', () => {
      const item = generateItem('leather_belt', 1, 'normal', eqRegistry);
      eqSystem.addItem(item);
      const result = eqSystem.equipItem(item.id);
      expect(result).toBe(true);
      expect(eqSystem.getEquipment().get('belt')).toBe(item);
    });
  });
});
