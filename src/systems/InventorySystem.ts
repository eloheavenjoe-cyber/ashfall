import type { ISystem } from '../core/ISystem';
import type { Item } from '../entities/Item';
import { Logger } from '../core/Logger';

export const EQUIPMENT_SLOTS = [
  'main_hand', 'off_hand', 'body', 'helm', 'gloves',
  'boots', 'ring_1', 'ring_2', 'amulet', 'belt',
] as const;

export type EquipmentSlotId = (typeof EQUIPMENT_SLOTS)[number];

interface StoredItem {
  item: Item;
  originCol: number;
  originRow: number;
}

export class InventorySystem implements ISystem {
  readonly name = 'InventorySystem';
  readonly logger = Logger.forSystem('INVENTORY');

  static readonly COLS = 5;
  static readonly ROWS = 8;
  static readonly SIZE = 40;
  static readonly EMPTY = 255;

  private occupancy!: Uint8Array;
  private stored: StoredItem[] = [];
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
    return new Map(this.equipmentMap);
  }

  private toIndex(col: number, row: number): number {
    return row * InventorySystem.COLS + col;
  }

  private toCol(index: number): number {
    return index % InventorySystem.COLS;
  }

  private toRow(index: number): number {
    return Math.floor(index / InventorySystem.COLS);
  }

  private findStored(itemId: string): { stored: StoredItem; idx: number } | null {
    for (let i = 0; i < this.stored.length; i++) {
      if (this.stored[i].item.id === itemId) return { stored: this.stored[i], idx: i };
    }
    return null;
  }

  canPlaceAt(item: Item, col: number, row: number): boolean {
    if (col < 0 || row < 0) return false;
    if (col + item.gridW > InventorySystem.COLS) return false;
    if (row + item.gridH > InventorySystem.ROWS) return false;
    for (let r = row; r < row + item.gridH; r++) {
      for (let c = col; c < col + item.gridW; c++) {
        const idx = this.toIndex(c, r);
        if (this.occupancy[idx] !== InventorySystem.EMPTY) return false;
      }
    }
    return true;
  }

  private occupy(item: Item, col: number, row: number): void {
    const idx = this.stored.length;
    for (let r = row; r < row + item.gridH; r++) {
      for (let c = col; c < col + item.gridW; c++) {
        this.occupancy[this.toIndex(c, r)] = idx;
      }
    }
    this.stored.push({ item, originCol: col, originRow: row });
  }

  private deoccupy(stored: StoredItem): void {
    for (let r = stored.originRow; r < stored.originRow + stored.item.gridH; r++) {
      for (let c = stored.originCol; c < stored.originCol + stored.item.gridW; c++) {
        this.occupancy[this.toIndex(c, r)] = InventorySystem.EMPTY;
      }
    }
  }

  findSlot(item: Item): { col: number; row: number } | null {
    for (let r = 0; r < InventorySystem.ROWS; r++) {
      for (let c = 0; c < InventorySystem.COLS; c++) {
        if (this.canPlaceAt(item, c, r)) return { col: c, row: r };
      }
    }
    return null;
  }

  addItem(item: Item): boolean {
    const slot = this.findSlot(item);
    if (!slot) return false;
    this.occupy(item, slot.col, slot.row);
    return true;
  }

  removeItem(itemId: string): Item | null {
    const found = this.findStored(itemId);
    if (!found) return null;
    this.deoccupy(found.stored);
    this.stored.splice(found.idx, 1);
    this.occupancy.fill(InventorySystem.EMPTY);
    for (let i = 0; i < this.stored.length; i++) {
      const s = this.stored[i];
      for (let r = s.originRow; r < s.originRow + s.item.gridH; r++) {
        for (let c = s.originCol; c < s.originCol + s.item.gridW; c++) {
          this.occupancy[this.toIndex(c, r)] = i;
        }
      }
    }
    return found.stored.item;
  }

  moveItem(itemId: string, toCol: number, toRow: number): boolean {
    const found = this.findStored(itemId);
    if (!found) return false;
    // Temporarily deoccupy, then check — allows overlapping original position
    this.deoccupy(found.stored);
    if (!this.canPlaceAt(found.stored.item, toCol, toRow)) {
      this.occupy(found.stored.item, found.stored.originCol, found.stored.originRow);
      return false;
    }
    found.stored.originCol = toCol;
    found.stored.originRow = toRow;
    this.occupy(found.stored.item, toCol, toRow);
    return true;
  }

  getItemAtCell(col: number, row: number): Item | null {
    if (col < 0 || col >= InventorySystem.COLS) return null;
    if (row < 0 || row >= InventorySystem.ROWS) return null;
    const idx = this.occupancy[this.toIndex(col, row)];
    if (idx === InventorySystem.EMPTY) return null;
    return this.stored[idx].item;
  }
}
