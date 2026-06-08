import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { PlayerSystem } from './PlayerSystem';
import type { InventorySystem } from './InventorySystem';
import type { SkillSystem } from './SkillSystem';
import type { SkillConfig } from '../data/dataConfigs';
import type { SaveData, CharacterSaveData, InventorySaveData, SkillSaveData, SerializedItem } from '../data/saveTypes';
import { serializeItem } from '../core/saveHelpers';

const staticLogger = Logger.forSystem('SAVE');
const STORAGE_KEY = 'ashfall_save_0';
const SAVE_VERSION = 1;

interface SaveSystemDeps {
  playerSystem: PlayerSystem;
  inventorySystem: InventorySystem;
  skillSystem: SkillSystem;
}

export class SaveSystem implements ISystem {
  readonly name = 'SaveSystem';
  readonly logger = Logger.forSystem('SAVE');

  private deps!: SaveSystemDeps;
  private didInit = false;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.deps = {
      playerSystem: cfg.playerSystem as PlayerSystem,
      inventorySystem: cfg.inventorySystem as InventorySystem,
      skillSystem: cfg.skillSystem as SkillSystem,
    };

    EventBus.getInstance().on(GameEvent.SAVE_TRIGGERED, this.onSaveTriggered, this);
    EventBus.getInstance().on(GameEvent.PLAYER_LEVEL_UP, this.onLevelUp, this);
    this.didInit = true;
    this.logger.info('Initialised');
  }

  destroy(): void {
    this.didInit = false;
    EventBus.getInstance().offAll(this);
  }

  update(_delta: number): void {
    // no per-frame logic
  }

  private onSaveTriggered = (payload: any): void => {
    this.save(payload?.reason ?? 'manual');
  };

  private onLevelUp = (_payload: any): void => {
    this.save('level_up');
  };

  save(reason: string): boolean {
    if (!this.didInit) return false;
    try {
      const player = this.deps.playerSystem.getPlayer();

      const character: CharacterSaveData = {
        classId: player.classId,
        position: { x: player.position.x, y: player.position.y },
        level: player.level,
        experience: player.experience,
        experienceToNext: player.experienceToNext,
        health: player.health,
        maxHealth: player.maxHealth,
        resource: player.resource,
        maxResource: player.maxResource,
        strength: player.strength,
        dexterity: player.dexterity,
        intelligence: player.intelligence,
        armour: player.armour,
        evasion: player.evasion,
      };

      const equipment = this.deps.inventorySystem.getEquipment();
      const equipped: Record<string, SerializedItem | null> = {};
      for (const [slot, item] of equipment) {
        equipped[slot] = item ? serializeItem(item, 0, 0) : null;
      }

      const storedItems = this.deps.inventorySystem.getStoredItems();
      const bag: SerializedItem[] = storedItems.map((s) =>
        serializeItem(s.item, s.originCol, s.originRow)
      );

      const inventory: InventorySaveData = {
        gold: this.deps.inventorySystem.getGold(),
        equipped,
        bag,
      };

      const slotMappings = this.deps.skillSystem.getAllSlotMappings();
      const skills: SkillSaveData = {
        slots: {} as Record<string, string | null>,
      };
      for (const [slot, skill] of Object.entries(slotMappings)) {
        skills.slots[slot] = skill ? (skill as SkillConfig).id : null;
      }

      const data: SaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        character,
        inventory,
        skills,
      };

      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);
      this.logger.info('Save written', { reason, byteSize: json.length });
      EventBus.getInstance().emit(GameEvent.SAVE_COMPLETE, { reason, slot: 0 });
      return true;
    } catch (err) {
      this.logger.error('Save failed', { reason, error: String(err) });
      EventBus.getInstance().emit(GameEvent.SAVE_FAILED, { reason, error: String(err) });
      return false;
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      const validation = SaveSystem.validateSave(data);
      if (!validation.valid) {
        staticLogger.fatal('Save data corruption detected', { errors: validation.errors });
        return null;
      }
      staticLogger.info('Save loaded', { slot: 0, characterLevel: data.character.level });
      EventBus.getInstance().emit(GameEvent.SAVE_LOADED, { slot: 0, characterLevel: data.character.level });
      return data;
    } catch (err) {
      staticLogger.error('Save load failed', { error: String(err) });
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  static validateSave(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      errors.push('save data must be an object');
      return { valid: false, errors };
    }
    const d = data as Record<string, unknown>;
    if (typeof d.version !== 'number') errors.push('version must be a number');
    if (!d.character || typeof d.character !== 'object') errors.push('character is required');
    else {
      const c = d.character as Record<string, unknown>;
      if (typeof c.classId !== 'string') errors.push('character.classId must be a string');
      if (typeof c.level !== 'number') errors.push('character.level must be a number');
      if (typeof c.health !== 'number') errors.push('character.health must be a number');
      if (typeof c.maxHealth !== 'number') errors.push('character.maxHealth must be a number');
    }
    if (!d.inventory || typeof d.inventory !== 'object') errors.push('inventory is required');
    if (!d.skills || typeof d.skills !== 'object') errors.push('skills is required');
    return { valid: errors.length === 0, errors };
  }
}
