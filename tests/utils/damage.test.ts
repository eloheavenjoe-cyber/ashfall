import { describe, it, expect, vi } from 'vitest';
import { calcDamage, applyMitigation } from '../../src/utils/damage';

describe('calcDamage', () => {
  it('returns a hit result with correct shape', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = calcDamage(20, 1.5, 0, 1.5);
    expect(result).toHaveProperty('damage');
    expect(result).toHaveProperty('rawDamage');
    expect(result).toHaveProperty('isCrit');
    expect(result.rawDamage).toBe(30);
    expect(result.damage).toBe(30);
    expect(result.isCrit).toBe(false);
    vi.restoreAllMocks();
  });

  it('produces damage within expected range', () => {
    const testRuns = 1000;
    let maxDamage = 0;
    let minDamage = Infinity;
    for (let i = 0; i < testRuns; i++) {
      const result = calcDamage(20, 1.0);
      if (result.rawDamage > maxDamage) maxDamage = result.rawDamage;
      if (result.rawDamage < minDamage) minDamage = result.rawDamage;
    }
    expect(minDamage).toBeGreaterThanOrEqual(14);
    expect(maxDamage).toBeLessThanOrEqual(26);
  });

  it('can produce critical strikes', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // damage roll
      .mockReturnValue(0.01);      // crit roll (under 0.05)

    const result = calcDamage(10, 1.0, 0.05, 2.0);
    expect(result.isCrit).toBe(true);
    expect(result.damage).toBe(result.rawDamage * 2);
    vi.restoreAllMocks();
  });

  it('applies critChance correctly at boundaries', () => {
    const results = { crit: 0, nonCrit: 0 };
    for (let i = 0; i < 10000; i++) {
      const r = calcDamage(10, 1.0, 0.3, 1.5);
      if (r.isCrit) results.crit++;
      else results.nonCrit++;
    }
    const critRate = results.crit / 10000;
    expect(critRate).toBeGreaterThan(0.25);
    expect(critRate).toBeLessThan(0.35);
  });
});

describe('applyMitigation', () => {
  it('reduces damage by armour value', () => {
    expect(applyMitigation(50, 10)).toBe(40);
  });

  it('returns minimum 1 damage even with high armour', () => {
    expect(applyMitigation(5, 100)).toBe(1);
  });

  it('returns 1 for 0 damage input with armour', () => {
    expect(applyMitigation(0, 5)).toBe(1);
  });

  it('returns the damage value when armour is 0', () => {
    expect(applyMitigation(30, 0)).toBe(30);
  });
});
