import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../../src/core/EventBus';
import { GameEvent } from '../../src/core/GameEvent';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on and emit', () => {
    it('calls subscribed handler when event is emitted', () => {
      let called = false;
      bus.on(GameEvent.PLAYER_LEVEL_UP, () => { called = true; });
      bus.emit(GameEvent.PLAYER_LEVEL_UP);
      expect(called).toBe(true);
    });

    it('passes payload to handler', () => {
      let received: unknown = null;
      bus.on(GameEvent.ZONE_LOADED, (payload) => { received = payload; });
      const payload = { zoneId: 'test_zone', seed: 42 };
      bus.emit(GameEvent.ZONE_LOADED, payload);
      expect(received).toEqual(payload);
    });

    it('supports multiple subscribers for the same event', () => {
      let count = 0;
      bus.on(GameEvent.COMBAT_HIT, () => { count++; });
      bus.on(GameEvent.COMBAT_HIT, () => { count++; });
      bus.emit(GameEvent.COMBAT_HIT);
      expect(count).toBe(2);
    });

    it('does not call subscribers of different events', () => {
      let called = false;
      bus.on(GameEvent.COMBAT_HIT, () => { called = true; });
      bus.emit(GameEvent.COMBAT_HIT, {});
      expect(called).toBe(true);
    });
  });

  describe('once', () => {
    it('calls handler only the first time the event is emitted', () => {
      let count = 0;
      bus.once(GameEvent.PLAYER_XP_GAINED, () => { count++; });
      bus.emit(GameEvent.PLAYER_XP_GAINED);
      bus.emit(GameEvent.PLAYER_XP_GAINED);
      bus.emit(GameEvent.PLAYER_XP_GAINED);
      expect(count).toBe(1);
    });

    it('passes payload to once handler', () => {
      let received: unknown = null;
      bus.once(GameEvent.SAVE_COMPLETE, (p) => { received = p; });
      bus.emit(GameEvent.SAVE_COMPLETE, { slot: 1 });
      expect(received).toEqual({ slot: 1 });
    });
  });

  describe('off', () => {
    it('removes a specific handler', () => {
      let count = 0;
      const handler = () => { count++; };
      bus.on(GameEvent.PLAYER_GOLD_CHANGED, handler);
      bus.off(GameEvent.PLAYER_GOLD_CHANGED, handler);
      bus.emit(GameEvent.PLAYER_GOLD_CHANGED);
      expect(count).toBe(0);
    });

    it('only removes matching handler when context is provided', () => {
      const ctx1 = {};
      const ctx2 = {};
      let c1 = 0;
      let c2 = 0;
      bus.on(GameEvent.ENEMY_DIED, () => { c1++; }, ctx1);
      bus.on(GameEvent.ENEMY_DIED, () => { c2++; }, ctx2);
      bus.off(GameEvent.ENEMY_DIED, () => { c1++; }, ctx1);
      bus.emit(GameEvent.ENEMY_DIED);
      expect(c1).toBe(1);
      expect(c2).toBe(1);
    });
  });

  describe('offAll', () => {
    it('removes all handlers for a given context', () => {
      const system = {};
      let eventA = 0;
      let eventB = 0;
      bus.on(GameEvent.PLAYER_LEVEL_UP, () => { eventA++; }, system);
      bus.on(GameEvent.ZONE_LOADED, () => { eventB++; }, system);
      bus.offAll(system);
      bus.emit(GameEvent.PLAYER_LEVEL_UP);
      bus.emit(GameEvent.ZONE_LOADED);
      expect(eventA).toBe(0);
      expect(eventB).toBe(0);
    });

    it('does not remove handlers from other contexts', () => {
      const ctx1 = {};
      const ctx2 = {};
      let c1 = 0;
      let c2 = 0;
      bus.on(GameEvent.PLAYER_LEVEL_UP, () => { c1++; }, ctx1);
      bus.on(GameEvent.PLAYER_LEVEL_UP, () => { c2++; }, ctx2);
      bus.offAll(ctx1);
      bus.emit(GameEvent.PLAYER_LEVEL_UP);
      expect(c1).toBe(0);
      expect(c2).toBe(1);
    });

    it('handles context with no subscriptions gracefully', () => {
      expect(() => bus.offAll({})).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('does not throw when a handler throws', () => {
      bus.on(GameEvent.PLAYER_MOVED, () => { throw new Error('bad handler'); });
      expect(() => bus.emit(GameEvent.PLAYER_MOVED)).not.toThrow();
    });

    it('calls remaining handlers after one throws', () => {
      let called = false;
      bus.on(GameEvent.PLAYER_MOVED, () => { throw new Error('bad'); });
      bus.on(GameEvent.PLAYER_MOVED, () => { called = true; });
      bus.emit(GameEvent.PLAYER_MOVED);
      expect(called).toBe(true);
    });
  });

  describe('subscriberCount', () => {
    it('returns 0 for event with no subscribers', () => {
      expect(bus.subscriberCount(GameEvent.PLAYER_LEVEL_UP)).toBe(0);
    });

    it('returns correct count after subscribing', () => {
      bus.on(GameEvent.PLAYER_LEVEL_UP, () => {});
      bus.on(GameEvent.PLAYER_LEVEL_UP, () => {});
      expect(bus.subscriberCount(GameEvent.PLAYER_LEVEL_UP)).toBe(2);
    });
  });

  describe('GameEvent values', () => {
    it('uses colon-separated namespaced format', () => {
      expect(GameEvent.COMBAT_HIT).toBe('combat:hit');
      expect(GameEvent.ZONE_LOADED).toBe('zone:loaded');
      expect(GameEvent.SAVE_COMPLETE).toBe('save:complete');
    });

    it('all events are non-empty strings', () => {
      const values = Object.values(GameEvent);
      values.forEach((v) => {
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      });
    });
  });
});
