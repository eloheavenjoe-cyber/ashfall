export interface StatRange {
  min: number;
  max: number;
}

export interface AttributeRequirement {
  strength?: number;
  dexterity?: number;
  intelligence?: number;
}

export interface ItemBaseConfig {
  id: string;
  name: string;
  slot: string;
  subtype: string;
  implicit: { statKey: string; value: number; label?: string } | null;
  armourRange?: StatRange;
  evasionRange?: StatRange;
  damageRange?: StatRange;
  critChance?: number;
  attackSpeed?: number;
  requirements: AttributeRequirement;
  maxSockets: number;
}

export type AffixType = 'prefix' | 'suffix';

export interface AffixConfig {
  id: string;
  name: string;
  type: AffixType;
  tier: 1 | 2 | 3 | 4 | 5;
  weight: number;
  statKey: string;
  minValue: number;
  maxValue: number;
  conflicts: string[];
}

export type EnemyTier = 'normal' | 'magic' | 'rare' | 'unique';

export interface EnemyLootTable {
  goldDrop: StatRange;
  itemDropChance: number;
  itemTypeWeights: Record<string, number>;
}

export interface EnemyConfig {
  id: string;
  name: string;
  tier: EnemyTier;
  attackType: 'melee' | 'ranged' | 'mixed';
  baseHP: number;
  baseDamage: number;
  moveSpeed: number;
  detectionRadius: number;
  attackRange: number;
  xpReward: number;
  lootTable: EnemyLootTable;
}

export interface SkillConfig {
  id: string;
  name: string;
  classId: string;
  slot: 'basic' | 'q' | 'e' | 'r' | 'f';
  resourceCost: number;
  resourceGenerated: number;
  cooldown: number;
  damageMultiplier: number;
  skillType: 'melee' | 'ranged' | 'aoe' | 'aoe_target' | 'buff' | 'mobility' | 'channeled';
  description: string;
  tags?: string[];
}

export interface SupportGemConfig {
  id: string;
  name: string;
  effectDescription: string;
  supportedTags: string[];
  damageMultiplier?: number;
  attackSpeedMultiplier?: number;
}

export interface ClassConfig {
  id: string;
  name: string;
  resourceType: string;
  baseStats: {
    health: number;
    maxResource: number;
    resourceRegen: number;
    armour?: number;
    evasion?: number;
    moveSpeed: number;
    strength: number;
    dexterity: number;
    intelligence: number;
    baseDamage?: number;
    critChance?: number;
    critMultiplier?: number;
  };
  startingSkillIds: string[];
  passives: string[];
  baseStatsPerLevel?: {
    health?: number;
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    armour?: number;
    evasion?: number;
  };
}

export interface ZoneConfig {
  zoneId: string;
  displayName: string;
  act: number;
  zoneLevel: number;
  tileset: string;
  layoutType: 'linear' | 'branching' | 'open' | 'dungeon' | 'boss_antechamber';
  size: 'small' | 'medium' | 'large';
  enemyRoster: { enemyId: string; weight: number }[];
  rareEnemyChance: number;
  magicEnemyChance: number;
  density: 'low' | 'medium' | 'high' | 'extreme';
  pois: {
    boss: boolean;
    shrines: { min: number; max: number };
    chests: { min: number; max: number };
  };
  ambientColour: string;
  musicTrack: string;
  connections: string[];
  isTown?: boolean;
}

export interface CurrencyConfig {
  id: string;
  name: string;
  description: string;
  effectType: string;
  stackSize: number;
}

export interface PassiveNodeConfig {
  id: number;
  name?: string;
  type: 'small' | 'notable' | 'keystone' | 'class_start';
  statBonuses: Record<string, number>;
  connections: number[];
  classId?: string;
  position?: { x: number; y: number };
}

export interface ShrineConfig {
  id: string;
  name: string;
  description: string;
  statKey: string;
  value: number;
  duration: number;
}

export interface BossPhase {
  hpThreshold: number;
  attacks: string[];
}

export interface BossConfig {
  id: string;
  name: string;
  baseHP: number;
  arenaTilesW: number;
  arenaTilesH: number;
  phases: BossPhase[];
  guaranteedLoot: string[];
}

export interface UniqueAffixOverride {
  affixId: string;
  minValue: number;
  maxValue: number;
}

export interface UniqueItemConfig {
  id: string;
  name: string;
  baseTypeId: string;
  affixes: UniqueAffixOverride[];
  flavourText: string;
  requiredLevel: number;
}
