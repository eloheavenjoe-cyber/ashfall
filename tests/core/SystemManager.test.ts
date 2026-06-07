import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemManager } from '../../src/core/SystemManager';
import { Logger, LogLevel } from '../../src/core/Logger';
import type { ISystem } from '../../src/core/ISystem';

describe('SystemManager', () => {
  let manager: SystemManager;
  let calls: string[];

  beforeEach(() => {
    Logger.getInstance().setLevel(LogLevel.OFF);
    Logger.getInstance().clear();
    manager = new SystemManager();
    calls = [];
  });

  class MockSystem implements ISystem {
    readonly name: string;
    readonly logger = Logger.forSystem('MOCK');
    constructor(name: string) { this.name = name; }
    init(): void { calls.push(`init:${this.name}`); }
    update(_delta: number): void { calls.push(`update:${this.name}`); }
    destroy(): void { calls.push(`destroy:${this.name}`); }
  }

  it('registers and initialises systems', () => {
    manager.add(new MockSystem('A'));
    manager.add(new MockSystem('B'));
    manager.initAll();
    expect(calls).toEqual(['init:A', 'init:B']);
  });

  it('runs updateAll on all systems', () => {
    manager.add(new MockSystem('A'));
    manager.initAll();
    manager.updateAll(0.016);
    expect(calls).toContain('update:A');
  });

  it('runs destroyAll in reverse order', () => {
    manager.add(new MockSystem('A'));
    manager.add(new MockSystem('B'));
    manager.destroyAll();
    expect(calls).toEqual(['destroy:B', 'destroy:A']);
  });

  it('removes a system by name', () => {
    manager.add(new MockSystem('A'));
    manager.add(new MockSystem('B'));
    const removed = manager.remove('A');
    expect(removed?.name).toBe('A');
    expect(calls).toContain('destroy:A');
    expect(manager.count()).toBe(1);
  });

  it('returns undefined when removing non-existent system', () => {
    expect(manager.remove('NONEXISTENT')).toBeUndefined();
  });

  it('get returns a system by name', () => {
    manager.add(new MockSystem('Test'));
    const sys = manager.get<ISystem>('Test');
    expect(sys?.name).toBe('Test');
  });

  it('get returns undefined for missing system', () => {
    expect(manager.get<ISystem>('Missing')).toBeUndefined();
  });

  it('getAll returns a copy of systems array', () => {
    manager.add(new MockSystem('A'));
    const all = manager.getAll();
    expect(all).toHaveLength(1);
  });

  it('count returns correct number', () => {
    expect(manager.count()).toBe(0);
    manager.add(new MockSystem('A'));
    expect(manager.count()).toBe(1);
  });

  it('handles systems with optional hook methods', () => {
    let ready = false;
    const sys: ISystem = {
      name: 'WithHooks',
      logger: Logger.forSystem('TEST'),
      init() {},
      update() {},
      destroy() {},
      onSceneReady() { ready = true; },
    };
    manager.add(sys);
    manager.fireSceneReady();
    expect(ready).toBe(true);
  });
});
