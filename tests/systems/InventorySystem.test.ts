import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { InventorySystem } from '../../src/systems/InventorySystem';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('InventorySystem', () => {
  let system: InventorySystem;

  beforeEach(() => {
    system = new InventorySystem();
    system.init({});
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
});
