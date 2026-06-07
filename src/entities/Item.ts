export type ItemRarity = 'normal' | 'magic' | 'rare' | 'unique';

export interface ItemAffix {
  affixId: string;
  value: number;
  label?: string;
}

export interface Item {
  id: string;
  baseTypeId: string;
  name: string;
  rarity: ItemRarity;
  ilvl: number;
  affixes: ItemAffix[];
  slot: string;
  subtype: string;
  implicit: { statKey: string; value: number; label?: string } | null;
  requirements: { strength?: number; dexterity?: number; intelligence?: number };
  gridW: number;
  gridH: number;
}

export function generateItemId(): string {
  return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getRarityColor(rarity: ItemRarity): number {
  switch (rarity) {
    case 'normal': return 0xaaaaaa;
    case 'magic': return 0x6666ff;
    case 'rare': return 0xffff44;
    case 'unique': return 0xd47000;
  }
}

export function getRarityHtmlColor(rarity: ItemRarity): string {
  switch (rarity) {
    case 'normal': return '#aaaaaa';
    case 'magic': return '#6666ff';
    case 'rare': return '#ffff44';
    case 'unique': return '#d47000';
  }
}
