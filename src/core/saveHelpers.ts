import type { Item } from '../entities/Item';
import type { SerializedItem } from '../data/saveTypes';

export function serializeItem(item: Item, originCol: number, originRow: number): SerializedItem {
  return {
    id: item.id,
    baseTypeId: item.baseTypeId,
    rarity: item.rarity,
    name: item.name,
    slot: item.slot,
    subtype: item.subtype,
    gridW: item.gridW,
    gridH: item.gridH,
    affixes: item.affixes.map(a => ({ ...a })),
    implicit: item.implicit ? { ...item.implicit } : null,
    requirements: { ...item.requirements },
    ilvl: item.ilvl,
    originCol,
    originRow,
  };
}

export function deserializeItem(data: SerializedItem): Item {
  return {
    id: data.id,
    baseTypeId: data.baseTypeId,
    rarity: data.rarity,
    name: data.name,
    slot: data.slot,
    subtype: data.subtype,
    implicit: data.implicit ? { ...data.implicit } : null,
    requirements: { ...data.requirements },
    gridW: data.gridW,
    gridH: data.gridH,
    ilvl: data.ilvl,
    affixes: data.affixes.map(a => ({ ...a })),
  };
}
