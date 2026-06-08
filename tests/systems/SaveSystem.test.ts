import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { SaveSystem } from '../../src/systems/SaveSystem';
import { EventBus } from '../../src/core/EventBus';
import { GameEvent } from '../../src/core/GameEvent';

const mockStorage: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
    get length() { return Object.keys(mockStorage).length; },
    key: (index: number) => Object.keys(mockStorage)[index] ?? null,
  },
  writable: true,
  configurable: true,
});

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

function makeMockSystems() {
    const player = {
      classId: 'ironclad',
      position: { x: 100, y: 200 },
      moveSpeed: 185,
      health: 80, maxHealth: 120,
      resource: 50, maxResource: 100, resourceType: 'rage',
      level: 3, experience: 250, experienceToNext: 390,
      strength: 18, dexterity: 8, intelligence: 5,
      armour: 15, evasion: 0,
    };

    const invState = {
      gold: 500,
      equipped: new Map([['main_hand', null], ['off_hand', null]]),
      storedItems: [] as any[],
    };

    const skillState = {
      mappings: { basic: { id: 'crushing_blow' }, q: null, e: null, r: null, f: null } as Record<string, any>,
    };

    return {
      playerSystem: {
        getPlayer: () => player,
        getClassId: () => 'ironclad',
        restore: (data: any) => {
          player.position.x = data.position.x;
          player.position.y = data.position.y;
          player.level = data.level;
          player.experience = data.experience;
          player.experienceToNext = data.experienceToNext;
          player.health = data.health;
          player.maxHealth = data.maxHealth;
          player.resource = data.resource;
          player.maxResource = data.maxResource;
          player.strength = data.strength;
          player.dexterity = data.dexterity;
          player.intelligence = data.intelligence;
          player.armour = data.armour;
          player.evasion = data.evasion;
        },
      },
      inventorySystem: {
        getGold: () => invState.gold,
        getEquipment: () => invState.equipped,
        getStoredItems: () => invState.storedItems,
        restore: (data: any) => {
          invState.gold = data.gold;
          invState.equipped.clear();
          for (const [slot, item] of data.equipped) {
            invState.equipped.set(slot, item);
          }
          invState.storedItems.length = 0;
          invState.storedItems.push(...data.bag);
        },
      },
      skillSystem: {
        getAllSlotMappings: () => skillState.mappings,
        restore: (data: any) => { skillState.mappings = { ...data.slots }; },
      },
    };
  }

describe('SaveSystem', () => {

  it('save() writes to localStorage and returns true', () => {
    const system = new SaveSystem();
    system.init(makeMockSystems() as any);
    const result = system.save('manual');
    expect(result).toBe(true);
    expect(localStorage.getItem('ashfall_save_0')).not.toBeNull();
    system.destroy();
  });

  it('load() returns parsed save data', () => {
    const system = new SaveSystem();
    system.init(makeMockSystems() as any);
    system.save('manual');

    const loaded = SaveSystem.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.character.classId).toBe('ironclad');
    expect(loaded!.character.level).toBe(3);
    expect(loaded!.inventory.gold).toBe(500);
    expect(loaded!.version).toBe(1);
    system.destroy();
  });

  it('hasSave() checks localStorage key existence', () => {
    localStorage.removeItem('ashfall_save_0');
    expect(SaveSystem.hasSave()).toBe(false);
    const system = new SaveSystem();
    system.init(makeMockSystems() as any);
    system.save('manual');
    expect(SaveSystem.hasSave()).toBe(true);
    system.destroy();
  });

  it('save() emits SAVE_COMPLETE on success', () => {
    const events: string[] = [];
    const bus = EventBus.getInstance();
    bus.on(GameEvent.SAVE_COMPLETE, (p: any) => events.push('complete'), {});
    const system = new SaveSystem();
    system.init(makeMockSystems() as any);
    system.save('manual');
    expect(events).toContain('complete');
    bus.offAll({});
    system.destroy();
  });

  it('save() emits SAVE_FAILED on error', () => {
    const events: string[] = [];
    const bus = EventBus.getInstance();
    bus.on(GameEvent.SAVE_FAILED, (p: any) => events.push('failed'), {});
    const system = new SaveSystem();
    system.init({} as any);
    const result = system.save('manual');
    expect(result).toBe(false);
    expect(events).toContain('failed');
    bus.offAll({});
    system.destroy();
  });

  it('load() returns null when no save exists', () => {
    localStorage.removeItem('ashfall_save_0');
    const result = SaveSystem.load();
    expect(result).toBeNull();
  });

  it('validateSave returns valid for correct data', () => {
    const data = {
      version: 1, timestamp: 1000,
      character: { classId: 'ironclad', position: { x: 0, y: 0 }, level: 1, experience: 0, experienceToNext: 130, health: 120, maxHealth: 120, resource: 100, maxResource: 100, strength: 18, dexterity: 8, intelligence: 5, armour: 15, evasion: 0 },
      inventory: { gold: 0, equipped: {}, bag: [] },
      skills: { slots: {} },
    };
    const result = SaveSystem.validateSave(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validateSave rejects missing required fields', () => {
    const result = SaveSystem.validateSave({ version: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validateSave rejects wrong types', () => {
    const data = {
      version: 1, timestamp: 1000,
      character: { classId: 42, position: { x: 0, y: 0 }, level: 1, experience: 0, experienceToNext: 130, health: 120, maxHealth: 120, resource: 100, maxResource: 100, strength: 18, dexterity: 8, intelligence: 5, armour: 15, evasion: 0 },
      inventory: { gold: 0, equipped: {}, bag: [] },
      skills: { slots: {} },
    };
    const result = SaveSystem.validateSave(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('character.classId must be a string');
  });

  it('auto-saves on PLAYER_LEVEL_UP', () => {
    const system = new SaveSystem();
    system.init(makeMockSystems() as any);
    localStorage.removeItem('ashfall_save_0');
    EventBus.getInstance().emit(GameEvent.PLAYER_LEVEL_UP, { newLevel: 2, oldLevel: 1 });
    expect(localStorage.getItem('ashfall_save_0')).not.toBeNull();
    system.destroy();
  });

  afterEach(() => {
    localStorage.removeItem('ashfall_save_0');
  });
});

describe('restore integration', () => {
  it('restores player state into PlayerSystem', () => {
    const { playerSystem } = makeMockSystems();
    const data = {
      position: { x: 500, y: 300 },
      level: 10, experience: 1200, experienceToNext: 1300,
      health: 90, maxHealth: 200, resource: 80, maxResource: 100,
      strength: 30, dexterity: 12, intelligence: 8, armour: 25, evasion: 5,
    };
    (playerSystem as any).restore(data);
    const p = playerSystem.getPlayer();
    expect(p.position.x).toBe(500);
    expect(p.level).toBe(10);
    expect(p.health).toBe(90);
    expect(p.strength).toBe(30);
  });

  it('restores inventory state into InventorySystem', () => {
    const { inventorySystem } = makeMockSystems();
    const item = { id: 'saved_item', slot: 'body', gridW: 2, gridH: 3 };
    const equipment = new Map<string, any>([['body', item]]);
    (inventorySystem as any).restore({
      gold: 999,
      equipped: equipment,
      bag: [{ item, originCol: 0, originRow: 2 }],
    });
    expect((inventorySystem as any).getGold()).toBe(999);
  });

  it('restores skills into SkillSystem', () => {
    const { skillSystem } = makeMockSystems();
    (skillSystem as any).restore({ slots: { basic: 'crushing_blow', q: null } });
    const mappings = skillSystem.getAllSlotMappings();
    expect(mappings.basic).not.toBeNull();
    expect(mappings.q).toBeNull();
  });
});
