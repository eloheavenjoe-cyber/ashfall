import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { Registry, GameRegistry } from '../../src/core/GameRegistry';
import { loadAllData } from '../../src/core/dataLoader';
import { Logger, LogLevel } from '../../src/core/Logger';

beforeAll(() => {
  Logger.getInstance().setLevel(LogLevel.OFF);
});

afterAll(() => {
  Logger.getInstance().setLevel(LogLevel.DEBUG);
});

describe('Registry', () => {
  let registry: Registry<string>;

  beforeEach(() => {
    registry = new Registry<string>('TestReg', 'fallback_val');
  });

  it('stores and retrieves entries', () => {
    registry.register('a', 'alpha');
    expect(registry.get('a')).toBe('alpha');
  });

  it('returns fallback for missing entries', () => {
    expect(registry.get('nonexistent')).toBe('fallback_val');
  });

  it('getOrNull returns null for missing entries', () => {
    expect(registry.getOrNull('nonexistent')).toBeNull();
  });

  it('reports correct count', () => {
    registry.register('a', 'alpha');
    registry.register('b', 'beta');
    expect(registry.count()).toBe(2);
  });

  it('has returns true for registered entries', () => {
    registry.register('x', 'value');
    expect(registry.has('x')).toBe(true);
    expect(registry.has('y')).toBe(false);
  });

  it('getAll returns a copy of all entries', () => {
    registry.register('k', 'v');
    const all = registry.getAll();
    expect(all.get('k')).toBe('v');
    all.set('k', 'modified');
    expect(registry.get('k')).toBe('v');
  });

  it('warns on overwrite', () => {
    Logger.getInstance().setLevel(LogLevel.WARN);
    registry.register('dup', 'first');
    registry.register('dup', 'second');
    expect(registry.get('dup')).toBe('second');
    const buffer = Logger.getInstance().getBuffer();
    const found = buffer.some((e) => e.message.includes('Overwriting'));
    expect(found).toBe(true);
    Logger.getInstance().setLevel(LogLevel.OFF);
    Logger.getInstance().clear();
  });
});

describe('GameRegistry', () => {
  it('creates all registries with correct default counts', () => {
    const gr = new GameRegistry();
    expect(gr.enemies.count()).toBe(0);
    expect(gr.items.count()).toBe(0);
    expect(gr.affixes.count()).toBe(0);
    expect(gr.skills.count()).toBe(0);
    expect(gr.classes.count()).toBe(0);
    expect(gr.zones.count()).toBe(0);
    expect(gr.currency.count()).toBe(0);
    expect(gr.passives.count()).toBe(0);
    expect(gr.shrines.count()).toBe(0);
    expect(gr.bosses.count()).toBe(0);
    expect(gr.uniques.count()).toBe(0);
    expect(gr.supports.count()).toBe(0);
  });

  it('returns fallback for missing entries in any registry', () => {
    const gr = new GameRegistry();
    const enemy = gr.enemies.get('no_such_enemy');
    expect(enemy.id).toBe('missing');
    expect(enemy.name).toBe('Missing Enemy');

    const item = gr.items.get('no_such_item');
    expect(item.id).toBe('missing');
    expect(item.name).toBe('Missing Item');

    const skill = gr.skills.get('no_such_skill');
    expect(skill.name).toBe('Missing Skill');
  });
});

describe('loadAllData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads data from fetch into the registry', async () => {
    const mockEnemies = [{ id: 'goblin', name: 'Goblin', tier: 'normal' }];
    const mockItems = [{ id: 'sword', name: 'Iron Sword', slot: 'main_hand' }];

    let fetchCallCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: string | URL) => {
      fetchCallCount++;
      const path = typeof url === 'string' ? url : url.toString();
      if (path.includes('enemies')) {
        return new Response(JSON.stringify(mockEnemies), { status: 200 });
      }
      if (path.includes('items')) {
        return new Response(JSON.stringify(mockItems), { status: 200 });
      }
      // Return empty array for all other files
      return new Response(JSON.stringify([]), { status: 200 });
    });

    const registry = new GameRegistry();
    await loadAllData(registry as any);

    expect(registry.enemies.has('goblin')).toBe(true);
    expect(registry.enemies.get('goblin').name).toBe('Goblin');
    expect(registry.items.has('sword')).toBe(true);
    expect(registry.items.get('sword').slot).toBe('main_hand');
    expect(fetchCallCount).toBeGreaterThan(0);
  });

  it('throws on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const registry = new GameRegistry();
    await expect(loadAllData(registry as any)).rejects.toThrow('Network error');
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' }),
    );

    const registry = new GameRegistry();
    await expect(loadAllData(registry as any)).rejects.toThrow('HTTP 404');
  });
});
