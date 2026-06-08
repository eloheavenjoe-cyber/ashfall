import type { ItemRarity, ItemAffix } from '../entities/Item';

export interface CharacterSaveData {
  classId: string;
  position: { x: number; y: number };
  level: number;
  experience: number;
  experienceToNext: number;
  health: number;
  maxHealth: number;
  resource: number;
  maxResource: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  armour: number;
  evasion: number;
}

export interface SerializedItem {
  id: string;
  baseTypeId: string;
  rarity: ItemRarity;
  name: string;
  slot: string;
  subtype: string;
  gridW: number;
  gridH: number;
  affixes: ItemAffix[];
  implicit: { statKey: string; value: number; label?: string } | null;
  requirements: { strength?: number; dexterity?: number; intelligence?: number };
  ilvl: number;
  originCol: number;
  originRow: number;
}

export interface InventorySaveData {
  gold: number;
  equipped: Record<string, SerializedItem | null>;
  bag: SerializedItem[];
}

export interface SkillSaveData {
  slots: Record<string, string | null>;
}

export interface SaveData {
  version: number;
  timestamp: number;
  character: CharacterSaveData;
  inventory: InventorySaveData;
  skills: SkillSaveData;
}
