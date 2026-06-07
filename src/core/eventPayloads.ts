export interface CombatHitPayload {
  attackerId: string;
  targetId: string;
  damage: number;
  rawDamage: number;
  damageType: string;
  isCrit: boolean;
  ailmentApplied: string | null;
  hitPosition: { x: number; y: number };
}

export interface LootItemDroppedPayload {
  itemId: string;
  rarity: string;
  baseTypeId: string;
  affixes: string[];
  ilvl: number;
  zoneId: string;
  worldPosition: { x: number; y: number };
  sourceEnemyId: string | null;
}

export interface PlayerLevelUpPayload {
  oldLevel: number;
  newLevel: number;
  totalXP: number;
  passivePointsTotal: number;
  skillPointsTotal: number;
}

export interface CraftingCurrencyAppliedPayload {
  currencyId: string;
  itemId: string;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  success: boolean;
}

export interface GamblingResultPayload {
  category: string;
  cost: number;
  itemId: string;
  rarity: string;
  baseTypeId: string;
  rarityRoll: number;
  isHotStreak: boolean;
  isHighRoller: boolean;
}

export interface ZoneLoadedPayload {
  zoneId: string;
  seed: number;
  layout: string;
  enemyCount: number;
  poiList: string[];
  generationTimeMs: number;
}
