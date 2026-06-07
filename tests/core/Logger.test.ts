import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset Logger singleton between tests by clearing buffer and resetting level
    const logger = Logger.getInstance();
    logger.clear();
    logger.setLevel(LogLevel.DEBUG);
    // Re-enable all system filters
    logger.filter('TEST', true);
    // Spy on console.log
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('forSystem', () => {
    it('returns an ILogger tagged with the given system name', () => {
      const log = Logger.forSystem('TEST');
      log.info('hello');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[TEST        ]');
      expect(output).toContain('hello');
    });

    it('uppercases the system tag', () => {
      const log = Logger.forSystem('combat_system');
      log.info('test');
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain('[COMBAT_SYSTE]');
    });
  });

  describe('log levels', () => {
    it('logs DEBUG and above by default', () => {
      const log = Logger.forSystem('TEST');
      log.debug('debug msg');
      log.info('info msg');
      log.warn('warn msg');
      log.error('error msg');
      log.fatal('fatal msg');
      expect(consoleSpy).toHaveBeenCalledTimes(5);
    });

    it('does not log VERBOSE at default level', () => {
      const log = Logger.forSystem('TEST');
      log.verbose('verbose msg');
      log.debug('debug msg');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('debug msg');
    });

    it('respects setLevel(WARN)', () => {
      Logger.getInstance().setLevel(LogLevel.WARN);
      const log = Logger.forSystem('TEST');
      log.debug('should not appear');
      log.info('should not appear');
      log.warn('should appear');
      log.error('should appear');
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toContain('should appear');
    });

    it('respects setLevel(OFF) to suppress everything', () => {
      Logger.getInstance().setLevel(LogLevel.OFF);
      const log = Logger.forSystem('TEST');
      log.error('should not appear');
      log.fatal('should not appear');
      expect(consoleSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('output format', () => {
    it('uses the correct log format with timestamp, level, system, message', () => {
      const log = Logger.forSystem('COMBAT');
      log.info('Hit resolved');
      const output = consoleSpy.mock.calls[0][0] as string;
      // Pattern: [HH:MM:SS.mmm] [LEVEL ] [SYSTEM      ] Message
      expect(output).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[INFO  \] \[COMBAT      \] Hit resolved$/);
    });

    it('appends JSON data when provided', () => {
      const log = Logger.forSystem('LOOT');
      log.info('Drop roll', { enemyId: 'husk_1', roll: 0.847 });
      const output = consoleSpy.mock.calls[0][0] as string;
      expect(output).toContain(' — ');
      expect(output).toContain('{"enemyId":"husk_1","roll":0.847}');
    });
  });

  describe('buffer', () => {
    it('stores entries in the rolling buffer', () => {
      const log = Logger.forSystem('TEST');
      log.info('first');
      log.warn('second');
      const buf = Logger.getInstance().getBuffer();
      expect(buf).toHaveLength(2);
      expect(buf[0].message).toBe('first');
      expect(buf[1].message).toBe('second');
    });

    it('caps the buffer at 500 entries', () => {
      const log = Logger.forSystem('TEST');
      for (let i = 0; i < 510; i++) {
        log.info(`entry ${i}`);
      }
      const buf = Logger.getInstance().getBuffer();
      expect(buf.length).toBeLessThanOrEqual(500);
      // Should have the last 500 entries
      expect(buf[0].message).toBe('entry 10');
      expect(buf[buf.length - 1].message).toBe('entry 509');
    });

    it('stores structured data in buffer entries', () => {
      const log = Logger.forSystem('CRAFTING');
      log.info('Orb applied', { currency: 'chaos_orb', itemId: 'item_42' });
      const buf = Logger.getInstance().getBuffer();
      expect(buf[0].data).toEqual({ currency: 'chaos_orb', itemId: 'item_42' });
    });
  });

  describe('filter', () => {
    it('suppresses log output for disabled systems', () => {
      Logger.getInstance().filter('TEST', false);
      const log = Logger.forSystem('TEST');
      log.info('should be suppressed');
      expect(consoleSpy).toHaveBeenCalledTimes(0);
    });

    it('allows re-enabling a filtered system', () => {
      Logger.getInstance().filter('TEST', false);
      Logger.getInstance().filter('TEST', true);
      const log = Logger.forSystem('TEST');
      log.info('should appear');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('does not affect other systems when filtering one', () => {
      Logger.getInstance().filter('TEST', false);
      const logA = Logger.forSystem('TEST');
      const logB = Logger.forSystem('OTHER');
      logA.info('suppressed');
      logB.info('visible');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('visible');
    });
  });

  describe('clear', () => {
    it('empties the log buffer', () => {
      const log = Logger.forSystem('TEST');
      log.info('something');
      Logger.getInstance().clear();
      expect(Logger.getInstance().getBuffer()).toHaveLength(0);
    });
  });
});
