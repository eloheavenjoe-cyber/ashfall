import { Logger } from './Logger';
import type {
  EnemyConfig,
  ItemBaseConfig,
  AffixConfig,
  SkillConfig,
  SupportGemConfig,
  ClassConfig,
  ZoneConfig,
  CurrencyConfig,
  PassiveNodeConfig,
  ShrineConfig,
  BossConfig,
  UniqueItemConfig,
} from '../data/dataConfigs';

const logger = Logger.forSystem('REGISTRY');

export interface IRegistry<T> {
  register(id: string, entry: T): void;
  get(id: string): T;
  getOrNull(id: string): T | null;
  getAll(): Map<string, T>;
  has(id: string): boolean;
  count(): number;
}

export class Registry<T> implements IRegistry<T> {
  private entries = new Map<string, T>();

  constructor(
    private readonly name: string,
    private readonly fallback: T,
  ) {}

  register(id: string, entry: T): void {
    if (this.entries.has(id)) {
      logger.warn('Overwriting existing entry', { registry: this.name, id });
    }
    this.entries.set(id, entry);
  }

  get(id: string): T {
    const entry = this.entries.get(id);
    if (!entry) {
      logger.error('Entry not found', {
        registry: this.name,
        requestedId: id,
        availableCount: this.entries.size,
      });
      return this.fallback;
    }
    return entry;
  }

  getOrNull(id: string): T | null {
    return this.entries.get(id) ?? null;
  }

  getAll(): Map<string, T> {
    return new Map(this.entries);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  count(): number {
    return this.entries.size;
  }
}

export interface IGameRegistry {
  enemies: IRegistry<EnemyConfig>;
  items: IRegistry<ItemBaseConfig>;
  affixes: IRegistry<AffixConfig>;
  skills: IRegistry<SkillConfig>;
  supports: IRegistry<SupportGemConfig>;
  classes: IRegistry<ClassConfig>;
  zones: IRegistry<ZoneConfig>;
  currency: IRegistry<CurrencyConfig>;
  passives: IRegistry<PassiveNodeConfig>;
  shrines: IRegistry<ShrineConfig>;
  bosses: IRegistry<BossConfig>;
  uniques: IRegistry<UniqueItemConfig>;
}

const EMPTY_ENEMY: EnemyConfig = {
  id: 'missing', name: 'Missing Enemy', tier: 'normal', attackType: 'melee',
  baseHP: 1, baseDamage: 0, moveSpeed: 0, detectionRadius: 0,
  attackRange: 0, xpReward: 0,
  lootTable: { goldDrop: { min: 0, max: 0 }, itemDropChance: 0, itemTypeWeights: {} },
};

const EMPTY_ITEM: ItemBaseConfig = {
  id: 'missing', name: 'Missing Item', slot: 'unknown', subtype: 'unknown',
  implicit: null, requirements: {}, maxSockets: 0,
};

const EMPTY_AFFIX: AffixConfig = {
  id: 'missing', name: 'Missing Affix', type: 'prefix', tier: 1,
  weight: 0, statKey: 'none', minValue: 0, maxValue: 0, conflicts: [],
};

const EMPTY_SKILL: SkillConfig = {
  id: 'missing', name: 'Missing Skill', classId: '', slot: 'basic',
  resourceCost: 0, resourceGenerated: 0, cooldown: 0, damageMultiplier: 0,
  skillType: 'melee', description: '',
};

const EMPTY_SUPPORT: SupportGemConfig = {
  id: 'missing', name: 'Missing Support', effectDescription: '', supportedTags: [],
};

const EMPTY_CLASS: ClassConfig = {
  id: 'missing', name: 'Missing Class', resourceType: 'none',
  baseStats: { health: 1, maxResource: 0, resourceRegen: 0, moveSpeed: 0, strength: 0, dexterity: 0, intelligence: 0 },
  startingSkillIds: [], passives: [],
};

const EMPTY_ZONE: ZoneConfig = {
  zoneId: 'missing', displayName: 'Missing Zone', act: 0, zoneLevel: 1,
  tileset: 'default', layoutType: 'linear', size: 'small',
  enemyRoster: [], rareEnemyChance: 0, magicEnemyChance: 0,
  density: 'medium', pois: { boss: false, shrines: { min: 0, max: 0 }, chests: { min: 0, max: 0 } },
  ambientColour: '#000000', musicTrack: 'default', connections: [],
};

const EMPTY_CURRENCY: CurrencyConfig = {
  id: 'missing', name: 'Missing Currency', description: '', effectType: 'none', stackSize: 0,
};

const EMPTY_PASSIVE: PassiveNodeConfig = {
  id: -1, type: 'small', statBonuses: {}, connections: [],
};

const EMPTY_SHRINE: ShrineConfig = {
  id: 'missing', name: 'Missing Shrine', description: '', statKey: 'none', value: 0, duration: 0,
};

const EMPTY_BOSS: BossConfig = {
  id: 'missing', name: 'Missing Boss', baseHP: 0, arenaTilesW: 0, arenaTilesH: 0,
  phases: [], guaranteedLoot: [],
};

const EMPTY_UNIQUE: UniqueItemConfig = {
  id: 'missing', name: 'Missing Unique', baseTypeId: '', affixes: [], flavourText: '', requiredLevel: 0,
};

export class GameRegistry implements IGameRegistry {
  enemies: IRegistry<EnemyConfig> = new Registry('EnemyConfig', EMPTY_ENEMY);
  items: IRegistry<ItemBaseConfig> = new Registry('ItemBaseConfig', EMPTY_ITEM);
  affixes: IRegistry<AffixConfig> = new Registry('AffixConfig', EMPTY_AFFIX);
  skills: IRegistry<SkillConfig> = new Registry('SkillConfig', EMPTY_SKILL);
  supports: IRegistry<SupportGemConfig> = new Registry('SupportGemConfig', EMPTY_SUPPORT);
  classes: IRegistry<ClassConfig> = new Registry('ClassConfig', EMPTY_CLASS);
  zones: IRegistry<ZoneConfig> = new Registry('ZoneConfig', EMPTY_ZONE);
  currency: IRegistry<CurrencyConfig> = new Registry('CurrencyConfig', EMPTY_CURRENCY);
  passives: IRegistry<PassiveNodeConfig> = new Registry('PassiveNodeConfig', EMPTY_PASSIVE);
  shrines: IRegistry<ShrineConfig> = new Registry('ShrineConfig', EMPTY_SHRINE);
  bosses: IRegistry<BossConfig> = new Registry('BossConfig', EMPTY_BOSS);
  uniques: IRegistry<UniqueItemConfig> = new Registry('UniqueItemConfig', EMPTY_UNIQUE);
}
