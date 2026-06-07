import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBus, Logger, LogLevel } from '../../src/core';
import type { ISystem, ZoneConfig } from '../../src/core';

describe('ISystem lifecycle', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
    Logger.getInstance().setLevel(LogLevel.OFF);
  });

  afterEach(() => {
    Logger.getInstance().setLevel(LogLevel.DEBUG);
  });

  it('a concrete system follows the init → update → destroy lifecycle', () => {
    const calls: string[] = [];

    class TestSystem implements ISystem {
      readonly name = 'TestSystem';
      readonly logger = Logger.forSystem('TEST');

      init(): void {
        calls.push('init');
        bus.on('test:event' as any, () => { calls.push('event'); }, this);
      }

      update(delta: number): void {
        calls.push(`update:${delta}`);
      }

      destroy(): void {
        bus.offAll(this);
        calls.push('destroy');
      }
    }

    const sys = new TestSystem();
    sys.init();
    bus.emit('test:event' as any);
    sys.update(0.016);
    sys.destroy();
    bus.emit('test:event' as any);

    expect(calls).toEqual(['init', 'event', 'update:0.016', 'destroy']);
  });

  it('destroy removes all event listeners for the system', () => {
    let count = 0;

    class ObservingSystem implements ISystem {
      readonly name = 'ObservingSystem';
      readonly logger = Logger.forSystem('OBS');
      init(): void { bus.on('player:level_up' as any, () => { count++; }, this); }
      update(_delta: number): void {}
      destroy(): void { bus.offAll(this); }
    }

    const sys = new ObservingSystem();
    sys.init();
    sys.destroy();
    bus.emit('player:level_up' as any);
    expect(count).toBe(0);
  });

  it('optional lifecycle hooks are not required', () => {
    class MinimalSystem implements ISystem {
      readonly name = 'Minimal';
      readonly logger = Logger.forSystem('MIN');
      init(): void {}
      update(_delta: number): void {}
      destroy(): void {}
    }

    const sys = new MinimalSystem();
    expect(() => {
      sys.init();
      sys.update(0.016);
      sys.destroy();
    }).not.toThrow();
  });

  it('can implement optional hooks', () => {
    let sceneReady = false;
    let zoneLoaded = false;
    let zoneExited = false;

    class FullSystem implements ISystem {
      readonly name = 'Full';
      readonly logger = Logger.forSystem('FULL');
      init(): void {}
      update(_delta: number): void {}
      destroy(): void {}
      onSceneReady(): void { sceneReady = true; }
      onZoneLoad(_config: ZoneConfig): void { zoneLoaded = true; }
      onZoneExit(): void { zoneExited = true; }
    }

    const sys = new FullSystem();
    sys.onSceneReady?.();
    sys.onZoneLoad?.({} as ZoneConfig);
    sys.onZoneExit?.();
    expect(sceneReady).toBe(true);
    expect(zoneLoaded).toBe(true);
    expect(zoneExited).toBe(true);
  });
});
