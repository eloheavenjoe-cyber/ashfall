import type { GameRegistry } from '../core/GameRegistry';
import type { Item, ItemAffix, ItemRarity } from '../entities/Item';
import { generateItemId, getRarityColor, getRarityHtmlColor } from '../entities/Item';
import type { AffixConfig, ItemBaseConfig } from '../data/dataConfigs';

interface DropResult {
  item: Item | null;
  gold: number;
}

export function getItemGridSize(slot: string, subtype: string): { w: number; h: number } {
  if (slot === 'ring' || slot === 'amulet') return { w: 1, h: 1 };
  if (slot === 'belt') return { w: 1, h: 2 };
  if (slot === 'gloves' || slot === 'boots' || slot === 'helm') return { w: 2, h: 2 };
  if (slot === 'off_hand') return { w: 2, h: 2 };
  if (slot === 'body') return { w: 2, h: 3 };
  if (slot === 'main_hand') {
    if (subtype.includes('two_hand')) return { w: 2, h: 3 };
    return { w: 1, h: 3 };
  }
  return { w: 1, h: 1 };
}

function getMaxTierForIlvl(ilvl: number): number {
  if (ilvl >= 50) return 5;
  if (ilvl >= 35) return 4;
  if (ilvl >= 20) return 3;
  if (ilvl >= 10) return 2;
  return 1;
}

function weightedPick<T>(items: T[], weightFn: (item: T) => number): T | null {
  if (items.length === 0) return null;
  const totalWeight = items.reduce((sum, item) => sum + weightFn(item), 0);
  if (totalWeight <= 0) return null;
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= weightFn(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rollItemRarity(rarityRoll: number): ItemRarity {
  if (rarityRoll < 0.6) return 'normal';
  if (rarityRoll < 0.9) return 'magic';
  return 'rare';
}

function buildItemName(baseName: string, affixes: ItemAffix[], fullAffixes: AffixConfig[]): string {
  if (affixes.length === 0) return baseName;

  const prefixNames: string[] = [];
  const suffixNames: string[] = [];

  for (const affix of affixes) {
    const config = fullAffixes.find((a) => a.id === affix.affixId);
    if (!config) continue;
    if (config.type === 'prefix') {
      prefixNames.push(config.name);
    } else {
      suffixNames.push(config.name);
    }
  }

  const prefix = prefixNames.join(' ');
  const suffix = suffixNames.join(' and ');
  const ofSuffix = suffix ? `of ${suffix}` : '';

  if (prefix && ofSuffix) return `${prefix} ${baseName} ${ofSuffix}`;
  if (prefix) return `${prefix} ${baseName}`;
  if (ofSuffix) return `${baseName} ${ofSuffix}`;
  return baseName;
}

function getAffixPool(
  type: 'prefix' | 'suffix',
  maxTier: number,
  selectedAffixes: ItemAffix[],
  allAffixes: AffixConfig[],
): AffixConfig[] {
  const selectedIds = new Set(selectedAffixes.map((a) => a.affixId));
  const selectedConfigs = selectedAffixes
    .map((a) => allAffixes.find((c) => c.id === a.affixId))
    .filter(Boolean) as AffixConfig[];

  const conflictIds = new Set<string>();
  for (const cfg of selectedConfigs) {
    for (const c of cfg.conflicts) {
      conflictIds.add(c);
    }
  }

  return allAffixes.filter((a) => {
    if (a.type !== type) return false;
    if (a.tier > maxTier) return false;
    if (selectedIds.has(a.id)) return false;
    if (conflictIds.has(a.id)) return false;
    return true;
  });
}

function rollAffixValue(affix: AffixConfig): number {
  return affix.minValue + Math.round(Math.random() * (affix.maxValue - affix.minValue));
}

export function generateItem(
  baseTypeId: string,
  ilvl: number,
  rarity: ItemRarity,
  registry: GameRegistry,
): Item {
  const base = registry.items.get(baseTypeId);
  const allAffixes = Array.from(registry.affixes.getAll().values());
  const maxTier = getMaxTierForIlvl(ilvl);

  let affixCount = 0;
  let prefixSlots = 0;
  let suffixSlots = 0;

  if (rarity === 'magic') {
    prefixSlots = 1;
    suffixSlots = 1;
    affixCount = Math.random() < 0.5 ? 1 : 2;
  } else if (rarity === 'rare') {
    prefixSlots = 2 + (Math.random() < 0.5 ? 1 : 0);
    suffixSlots = 2 + (Math.random() < 0.5 ? 1 : 0);
    affixCount = Math.min(prefixSlots + suffixSlots, 6);
  }

  const affixes: ItemAffix[] = [];

  if (rarity !== 'normal') {
    const picked: ItemAffix[] = [];

    const rollType = (type: 'prefix' | 'suffix', slots: number) => {
      for (let i = 0; i < slots; i++) {
        const pool = getAffixPool(type, maxTier, picked, allAffixes);
        if (pool.length === 0) break;
        const pick = weightedPick(pool, (a) => a.weight);
        if (!pick) break;
        picked.push({ affixId: pick.id, value: rollAffixValue(pick) });
      }
    };

    // Try to fill prefix slots first, then suffix slots
    rollType('prefix', prefixSlots);
    rollType('suffix', suffixSlots);

    // If we still have room, fill remaining from whichever pool still has entries
    const remaining = affixCount - picked.length;
    for (let i = 0; i < remaining; i++) {
      const prefixPool = getAffixPool('prefix', maxTier, picked, allAffixes);
      const suffixPool = getAffixPool('suffix', maxTier, picked, allAffixes);
      const usePrefix = prefixPool.length >= suffixPool.length;
      const pool = usePrefix ? prefixPool : suffixPool;
      if (pool.length === 0) break;
      const pick = weightedPick(pool, (a) => a.weight);
      if (!pick) break;
      picked.push({ affixId: pick.id, value: rollAffixValue(pick) });
    }

    affixes.push(...picked);
  }

  const gridSize = getItemGridSize(base.slot, base.subtype);
  const name = buildItemName(base.name, affixes, allAffixes);

  return {
    id: generateItemId(),
    baseTypeId: base.id,
    name,
    rarity,
    ilvl,
    affixes,
    slot: base.slot,
    subtype: base.subtype,
    implicit: base.implicit,
    requirements: base.requirements,
    gridW: gridSize.w,
    gridH: gridSize.h,
  };
}

export function generateLootDrop(
  enemyConfigId: string,
  zoneLevel: number,
  registry: GameRegistry,
): DropResult {
  const enemyConfig = registry.enemies.getOrNull(enemyConfigId);
  if (!enemyConfig) return { item: null, gold: 0 };

  const goldMin = enemyConfig.lootTable.goldDrop.min;
  const goldMax = enemyConfig.lootTable.goldDrop.max;
  const gold = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));

  const dropRoll = Math.random();
  if (dropRoll > enemyConfig.lootTable.itemDropChance) {
    return { item: null, gold };
  }

  const typeRoll = Math.random();
  let cumulative = 0;
  let chosenCategory = 'weapon';
  for (const [cat, weight] of Object.entries(enemyConfig.lootTable.itemTypeWeights)) {
    cumulative += weight;
    if (typeRoll < cumulative) { chosenCategory = cat; break; }
  }

  const allItems = Array.from(registry.items.getAll().values());
  let baseTypeId: string | null = null;

  if (chosenCategory === 'weapon') {
    const weapons = allItems.filter((i) => i.slot === 'main_hand');
    const pick = weapons[Math.floor(Math.random() * weapons.length)];
    if (pick) baseTypeId = pick.id;
  } else if (chosenCategory === 'armour') {
    const armours = allItems.filter((i) => i.slot === 'body' || i.slot === 'helm' || i.slot === 'gloves' || i.slot === 'boots');
    const pick = armours[Math.floor(Math.random() * armours.length)];
    if (pick) baseTypeId = pick.id;
  } else if (chosenCategory === 'accessory') {
    const accs = allItems.filter((i) => i.slot === 'ring' || i.slot === 'amulet' || i.slot === 'belt');
    const pick = accs[Math.floor(Math.random() * accs.length)];
    if (pick) baseTypeId = pick.id;
  } else if (chosenCategory === 'currency') {
    return { item: null, gold };
  }

  if (!baseTypeId) return { item: null, gold };

  const rarityRoll = Math.random();
  const rarity = rollItemRarity(rarityRoll);
  const item = generateItem(baseTypeId, zoneLevel, rarity, registry);

  return { item, gold };
}
