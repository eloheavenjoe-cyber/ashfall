import type { ISystem } from '../core/ISystem';
import type { Item } from '../entities/Item';
import { Logger } from '../core/Logger';

export const EQUIPMENT_SLOTS = [
  'main_hand', 'off_hand', 'body', 'helm', 'gloves',
  'boots', 'ring_1', 'ring_2', 'amulet', 'belt',
] as const;

export type EquipmentSlotId = (typeof EQUIPMENT_SLOTS)[number];

export class InventorySystem implements ISystem {
  readonly name = 'InventorySystem';
  readonly logger = Logger.forSystem('INVENTORY');

  static readonly COLS = 5;
  static readonly ROWS = 8;
  static readonly SIZE = 40;
  static readonly EMPTY = 255;

  private occupancy!: Uint8Array;
  private stored: { item: Item; originCol: number; originRow: number }[] = [];
  private equipmentMap!: Map<EquipmentSlotId, Item | null>;
  private goldAmount = 0;
  private didInit = false;

  init(_config?: Record<string, unknown>): void {
    this.occupancy = new Uint8Array(InventorySystem.SIZE).fill(InventorySystem.EMPTY);
    this.stored = [];
    this.equipmentMap = new Map();
    for (const slot of EQUIPMENT_SLOTS) {
      this.equipmentMap.set(slot, null);
    }
    this.goldAmount = 0;
    this.didInit = true;
  }

  destroy(): void {
    this.didInit = false;
    this.stored = [];
    this.occupancy = new Uint8Array();
    this.equipmentMap.clear();
    this.goldAmount = 0;
  }

  update(_delta: number): void {
    // no per-frame logic
  }

  getGold(): number {
    return this.goldAmount;
  }

  getInventorySlots(): (Item | null)[] {
    const result: (Item | null)[] = new Array(InventorySystem.SIZE).fill(null);
    for (const s of this.stored) {
      for (let r = s.originRow; r < s.originRow + s.item.gridH; r++) {
        for (let c = s.originCol; c < s.originCol + s.item.gridW; c++) {
          result[r * InventorySystem.COLS + c] = s.item;
        }
      }
    }
    return result;
  }

  getEquipment(): ReadonlyMap<EquipmentSlotId, Item | null> {
    return this.equipmentMap;
  }
}
