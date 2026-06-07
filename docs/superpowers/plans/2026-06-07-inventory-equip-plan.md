# Phase 1.4.2: Inventory & Equip UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 5×8 grid inventory with variable-sized items, 10-slot equipment character sheet, drag-and-drop interaction, and floating tooltips.

**Architecture:** `InventorySystem` (ISystem) owns data/logic. `InventoryUIScene` (Phaser.Scene) renders UI. EventBus connects them. Game pauses when panels are open.

**Tech Stack:** Phaser 3, TypeScript, Vitest

---

### File Structure

**New files:**
- `src/systems/InventorySystem.ts` — occupancy grid, items, equipment, gold, query/mutate methods
- `src/scenes/InventoryUIScene.ts` — two panels (inventory grid + character sheet), drag/drop, tooltips
- `tests/systems/InventorySystem.test.ts` — grid math, placement, equip logic

**Modified files:**
- `src/systems/LootSystem.ts` — wire pickup to inventory
- `src/scenes/GameScene.ts` — add InventorySystem to SystemManager, launch InventoryUIScene
- `src/main.ts` — register InventoryUIScene in scene list

---

### Task 1: InventorySystem — Core Structure + Initial State

**Files:**
- Create: `src/systems/InventorySystem.ts`
- Create: `tests/systems/InventorySystem.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/systems/InventorySystem.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { InventorySystem } from '../../src/systems/InventorySystem';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('InventorySystem', () => {
  let system: InventorySystem;

  beforeEach(() => {
    system = new InventorySystem();
    system.init({});
  });

  it('has 40 empty slots on init', () => {
    const slots = system.getInventorySlots();
    expect(slots.length).toBe(40);
    expect(slots.every(s => s === null)).toBe(true);
  });

  it('starts with empty equipment', () => {
    const eq = system.getEquipment();
    expect(eq.size).toBe(10);
    for (const v of eq.values()) {
      expect(v).toBeNull();
    }
  });

  it('starts with 0 gold', () => {
    expect(system.getGold()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/systems/InventorySystem.test.ts`
Expected: Cannot find module `../../src/systems/InventorySystem`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/systems/InventorySystem.ts
import type { ISystem } from '../core/ISystem';
import type { Item } from '../entities/Item';
import { Logger } from '../core/Logger';

const logger = Logger.forSystem('INVENTORY');

interface StoredItem {
  item: Item;
  originCol: number;
  originRow: number;
}

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
  private stored: StoredItem[] = [];
  private equipment!: Map<EquipmentSlotId, Item | null>;
  private gold = 0;
  private didInit = false;

  init(): void {
    this.occupancy = new Uint8Array(InventorySystem.SIZE).fill(InventorySystem.EMPTY);
    this.stored = [];
    this.equipment = new Map();
    for (const slot of EQUIPMENT_SLOTS) {
      this.equipment.set(slot as EquipmentSlotId, null);
    }
    this.gold = 0;
    this.didInit = true;
    logger.info('Initialised');
  }

  destroy(): void {
    this.didInit = false;
    this.stored = [];
    this.occupancy = new Uint8Array();
    this.equipment.clear();
    this.gold = 0;
  }

  update(): void {
    // no per-frame logic
  }

  getGold(): number { return this.gold; }

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
    return this.equipment;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/systems/InventorySystem.test.ts`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add src/systems/InventorySystem.ts tests/systems/InventorySystem.test.ts
git commit -m "feat: InventorySystem core structure with initial state"
```

---

### Task 2: InventorySystem — Placement Logic (canPlaceAt, findSlot, addItem, removeItem)

**Files:**
- Modify: `src/systems/InventorySystem.ts`
- Modify: `tests/systems/InventorySystem.test.ts`

- [ ] **Step 1: Register test item bases + write placement tests**

```typescript
// tests/systems/InventorySystem.test.ts additions
import { GameRegistry } from '../../src/core/GameRegistry';
import { generateItem } from '../../src/systems/ItemGenerator';

describe('InventorySystem grid placement', () => {
  let system: InventorySystem;
  let registry: GameRegistry;

  function makeRegistry(): GameRegistry {
    const r = new GameRegistry();
    r.items.register('iron_plate', {
      id: 'iron_plate', name: 'Iron Plate', slot: 'body', subtype: 'armour',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.items.register('copper_ring', {
      id: 'copper_ring', name: 'Copper Ring', slot: 'ring', subtype: 'ring',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.items.register('war_axe', {
      id: 'war_axe', name: 'War Axe', slot: 'main_hand', subtype: 'two_hand_melee',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.affixes.register('test_prefix', {
      id: 'test_prefix', name: 'Test', type: 'prefix', tier: 1, weight: 100,
      statKey: 'armour', minValue: 10, maxValue: 20, conflicts: [],
    });
    return r;
  }

  beforeEach(() => {
    system = new InventorySystem();
    system.init({});
    registry = makeRegistry();
  });

  it('places a 1x1 item in slot 0', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    const added = system.addItem(item);
    expect(added).toBe(true);
    expect(system.getItemAtCell(0, 0)).toBe(item);
  });

  it('canPlaceAt returns false when cells are occupied', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const canPlace = system.canPlaceAt(item, 0, 0);
    expect(canPlace).toBe(false);
  });

  it('canPlaceAt returns true for empty cells', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    const canPlace = system.canPlaceAt(item, 1, 0);
    expect(canPlace).toBe(true);
  });

  it('places a 2x3 body item correctly', () => {
    const item = generateItem('iron_plate', 1, 'normal', registry);
    const added = system.addItem(item);
    expect(added).toBe(true);
    // Body items are 2x3 (gridW=2, gridH=3), occupying cells 0,1,5,6,10,11
    expect(system.getItemAtCell(0, 0)).toBe(item);
    expect(system.getItemAtCell(1, 0)).toBe(item);
    expect(system.getItemAtCell(0, 1)).toBe(item);
    expect(system.getItemAtCell(1, 1)).toBe(item);
    expect(system.getItemAtCell(0, 2)).toBe(item);
    expect(system.getItemAtCell(1, 2)).toBe(item);
  });

  it('canPlaceAt rejects out-of-bounds position', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    expect(system.canPlaceAt(item, -1, 0)).toBe(false);
    expect(system.canPlaceAt(item, 5, 0)).toBe(false);
    expect(system.canPlaceAt(item, 0, -1)).toBe(false);
    expect(system.canPlaceAt(item, 0, 8)).toBe(false);
  });

  it('canPlaceAt rejects if item extends beyond grid edge', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    // 1x1 item at col=4, row=7 is valid (col+1=5, row+1=8)
    expect(system.canPlaceAt(item, 4, 7)).toBe(true);
    // 1x1 item at col=5, row=0 is invalid
    expect(system.canPlaceAt(item, 5, 0)).toBe(false);
    // 1x1 item at col=0, row=8 is invalid
    expect(system.canPlaceAt(item, 0, 8)).toBe(false);

    // 2x3 body item at right edge
    const body = generateItem('iron_plate', 1, 'normal', registry);
    expect(system.canPlaceAt(body, 4, 0)).toBe(false);  // col+2=6 > 5
    expect(system.canPlaceAt(body, 0, 7)).toBe(false);  // row+3=10 > 8
    expect(system.canPlaceAt(body, 0, 6)).toBe(false);  // row+3=9 > 8
    expect(system.canPlaceAt(body, 0, 5)).toBe(true);   // row+3=8 <= 8
  });

  it('fills all 40 slots with 1x1 items', () => {
    for (let i = 0; i < 40; i++) {
      const item = generateItem('copper_ring', 1, 'normal', registry);
      expect(system.addItem(item)).toBe(true);
    }
    // Try one more
    const extra = generateItem('copper_ring', 1, 'normal', registry);
    expect(system.addItem(extra)).toBe(false);
  });

  it('removeItem removes item from grid', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const removed = system.removeItem(item.id);
    expect(removed).toBe(item);
    expect(system.getItemAtCell(0, 0)).toBeNull();
    // All slots should be empty
    const slots = system.getInventorySlots();
    expect(slots.every(s => s === null)).toBe(true);
  });

  it('moveItem moves item to new position', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const moved = system.moveItem(item.id, 2, 3);
    expect(moved).toBe(true);
    expect(system.getItemAtCell(0, 0)).toBeNull();
    expect(system.getItemAtCell(2, 3)).toBe(item);
  });

  it('moveItem returns false if target is blocked', () => {
    const item1 = generateItem('copper_ring', 1, 'normal', registry);
    const item2 = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item1);
    system.addItem(item2);
    const moved = system.moveItem(item1.id, 1, 0);
    // slot 1,0 should be occupied by item2
    expect(moved).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/systems/InventorySystem.test.ts`
Expected: Tests fail — methods not found

- [ ] **Step 3: Implement placement methods**

Add to `InventorySystem`:

```typescript
// Add these fields
private stored: StoredItem[] = [];

// Add these methods
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
  if (!slot) {
    logger.warn('Inventory full, cannot add item', { itemId: item.id, name: item.name });
    return false;
  }
  this.occupy(item, slot.col, slot.row);
  logger.info('Item added to inventory', { itemId: item.id, name: item.name, col: slot.col, row: slot.row });
  return true;
}

removeItem(itemId: string): Item | null {
  const found = this.findStored(itemId);
  if (!found) return null;
  this.deoccupy(found.stored);
  this.stored.splice(found.idx, 1);
  // Rebuild occupancy from remaining items
  this.occupancy.fill(InventorySystem.EMPTY);
  for (let i = 0; i < this.stored.length; i++) {
    const s = this.stored[i];
    for (let r = s.originRow; r < s.originRow + s.item.gridH; r++) {
      for (let c = s.originCol; c < s.originCol + s.item.gridW; c++) {
        this.occupancy[this.toIndex(c, r)] = i;
      }
    }
  }
  logger.info('Item removed from inventory', { itemId });
  return found.stored.item;
}

moveItem(itemId: string, toCol: number, toRow: number): boolean {
  const found = this.findStored(itemId);
  if (!found) return false;
  if (!this.canPlaceAt(found.stored.item, toCol, toRow)) return false;
  this.deoccupy(found.stored);
  found.stored.originCol = toCol;
  found.stored.originRow = toRow;
  this.occupy(found.stored.item, toCol, toRow);
  logger.info('Item moved in inventory', { itemId, toCol, toRow });
  return true;
}

getItemAtCell(col: number, row: number): Item | null {
  const idx = this.occupancy[this.toIndex(col, row)];
  if (idx === InventorySystem.EMPTY) return null;
  return this.stored[idx].item;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/systems/InventorySystem.test.ts`
Expected: All placement tests pass

- [ ] **Step 5: Commit**

```bash
git add src/systems/InventorySystem.ts tests/systems/InventorySystem.test.ts
git commit -m "feat: InventorySystem grid placement with variable-size items"
```

---

### Task 3: InventorySystem — Equipment Logic

**Files:**
- Modify: `src/systems/InventorySystem.ts`
- Modify: `tests/systems/InventorySystem.test.ts`

- [ ] **Step 1: Write equip/unequip tests**

```typescript
// tests/systems/InventorySystem.test.ts additions
describe('InventorySystem equipment', () => {
  let system: InventorySystem;
  let registry: GameRegistry;

  function makeRegistry(): GameRegistry {
    const r = new GameRegistry();
    r.items.register('iron_plate', {
      id: 'iron_plate', name: 'Iron Plate', slot: 'body', subtype: 'armour',
      implicit: null, requirements: { strength: 25 }, maxSockets: 0,
    });
    r.items.register('copper_ring', {
      id: 'copper_ring', name: 'Copper Ring', slot: 'ring', subtype: 'ring',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    r.items.register('war_axe', {
      id: 'war_axe', name: 'War Axe', slot: 'main_hand', subtype: 'two_hand_melee',
      implicit: null, requirements: { strength: 30 }, maxSockets: 0,
    });
    r.items.register('tower_shield', {
      id: 'tower_shield', name: 'Tower Shield', slot: 'off_hand', subtype: 'shield',
      implicit: null, requirements: {}, maxSockets: 0,
    });
    return r;
  }

  beforeEach(() => {
    system = new InventorySystem();
    system.init({});
    registry = makeRegistry();
  });

  it('equips body item to body slot', () => {
    const item = generateItem('iron_plate', 1, 'normal', registry);
    system.addItem(item);
    const result = system.equipItem(item.id);
    expect(result).toBe(true);
    expect(system.getEquipment().get('body')).toBe(item);
    expect(system.getItemAtCell(0, 0)).toBeNull();
  });

  it('does not equip to mismatched slot', () => {
    const item = generateItem('iron_plate', 1, 'normal', registry);
    system.addItem(item);
    // Force equip off_hand — should fail since item.slot !== 'off_hand'
    const result = system.unequipItem('off_hand');
    expect(result).toBe(false);
  });

  it('equips ring to ring_1 when ring_1 is empty', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    const result = system.equipItem(item.id);
    expect(result).toBe(true);
    // Should go to ring_1
    expect(system.getEquipment().get('ring_1')).toBe(item);
    expect(system.getEquipment().get('ring_2')).toBeNull();
  });

  it('equips ring to ring_2 when ring_1 is occupied', () => {
    const ring1 = generateItem('copper_ring', 1, 'normal', registry);
    const ring2 = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(ring1);
    system.addItem(ring2);
    system.equipItem(ring1.id);
    const result = system.equipItem(ring2.id);
    expect(result).toBe(true);
    expect(system.getEquipment().get('ring_2')).toBe(ring2);
  });

  it('unequipItem moves item back to inventory', () => {
    const item = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(item);
    system.equipItem(item.id);
    const result = system.unequipItem('ring_1');
    expect(result).toBe(true);
    expect(system.getEquipment().get('ring_1')).toBeNull();
    // Should be back in inventory
    const slots = system.getInventorySlots();
    expect(slots.some(s => s?.id === item.id)).toBe(true);
  });

  it('unequipItem fails when inventory is full', () => {
    const ring = generateItem('copper_ring', 1, 'normal', registry);
    system.addItem(ring);
    system.equipItem(ring.id);
    // Fill inventory with 40 rings
    const fillItems: import('../../src/entities/Item').Item[] = [];
    for (let i = 0; i < 40; i++) {
      const fillItem = generateItem('copper_ring', 1, 'normal', registry);
      system.addItem(fillItem);
      fillItems.push(fillItem);
    }
    const result = system.unequipItem('ring_1');
    expect(result).toBe(false);
    expect(system.getEquipment().get('ring_1')).toBe(ring);
  });

  it('equipItem with occupied slot swaps items', () => {
    const body1 = generateItem('iron_plate', 1, 'normal', registry);
    const body2 = generateItem('iron_plate', 1, 'normal', registry);
    system.addItem(body1);
    system.addItem(body2);
    system.equipItem(body1.id);
    // body1 is now equipped, body2 is in inventory
    const result = system.equipItem(body2.id);
    expect(result).toBe(true);
    // body2 should be equipped, body1 should be back in inventory
    expect(system.getEquipment().get('body')).toBe(body2);
    const slots = system.getInventorySlots();
    expect(slots.some(s => s?.id === body1.id)).toBe(true);
  });

  it('addGold increases gold', () => {
    system.addGold(100);
    expect(system.getGold()).toBe(100);
    system.addGold(50);
    expect(system.getGold()).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/systems/InventorySystem.test.ts`
Expected: Tests fail — equipItem/unequipItem not found

- [ ] **Step 3: Implement equip/unequip methods**

Add to `InventorySystem`:

```typescript
// Slot mapping: item.slot → equipment slot ID(s)
private getTargetSlots(itemSlot: string): EquipmentSlotId[] {
  switch (itemSlot) {
    case 'main_hand': return ['main_hand'];
    case 'off_hand': return ['off_hand'];
    case 'body': return ['body'];
    case 'helm': return ['helm'];
    case 'gloves': return ['gloves'];
    case 'boots': return ['boots'];
    case 'ring': return ['ring_1', 'ring_2'];
    case 'amulet': return ['amulet'];
    case 'belt': return ['belt'];
    default: return [];
  }
}

equipItem(itemId: string): boolean {
  const found = this.findStored(itemId);
  if (!found) return false;
  const { stored, idx } = found;
  const targetSlots = this.getTargetSlots(stored.item.slot);
  if (targetSlots.length === 0) return false;

  // Find first empty or occupied slot
  let targetSlot: EquipmentSlotId | null = null;
  let occupiedBy: Item | null = null;
  for (const slotId of targetSlots) {
    const current = this.equipment.get(slotId) ?? null;
    if (current === null) {
      targetSlot = slotId;
      occupiedBy = null;
      break;
    }
    targetSlot = slotId;
    occupiedBy = current;
  }
  if (!targetSlot) return false;

  // If target slot is occupied, unequip that item first
  if (occupiedBy) {
    const swapped = this.unequipItem(targetSlot);
    if (!swapped) return false;
  }

  // Remove from inventory
  this.deoccupy(stored);
  this.stored.splice(idx, 1);
  this.occupancy.fill(InventorySystem.EMPTY);
  for (let i = 0; i < this.stored.length; i++) {
    const s = this.stored[i];
    for (let r = s.originRow; r < s.originRow + s.item.gridH; r++) {
      for (let c = s.originCol; c < s.originCol + s.item.gridW; c++) {
        this.occupancy[this.toIndex(c, r)] = i;
      }
    }
  }

  // Equip
  this.equipment.set(targetSlot, stored.item);
  logger.info('Item equipped', { itemId, slot: targetSlot });
  return true;
}

unequipItem(slotId: EquipmentSlotId): boolean {
  const item = this.equipment.get(slotId) ?? null;
  if (!item) return false;

  // Try to add to inventory
  const slot = this.findSlot(item);
  if (!slot) {
    logger.warn('Cannot unequip: inventory full', { itemId: item.id, slot: slotId });
    return false;
  }

  this.equipment.set(slotId, null);
  this.occupy(item, slot.col, slot.row);
  logger.info('Item unequipped', { itemId: item.id, slot: slotId });
  return true;
}

addGold(amount: number): void {
  this.gold = Math.min(this.gold + amount, 9_999_999);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/systems/InventorySystem.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/systems/InventorySystem.ts tests/systems/InventorySystem.test.ts
git commit -m "feat: InventorySystem equip/unequip with slot matching and swap"
```

---

### Task 4: Wire InventorySystem into GameScene + LootSystem

**Files:**
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/systems/LootSystem.ts`

- [ ] **Step 1: Wire InventorySystem into GameScene**

In `src/scenes/GameScene.ts`:
1. Import `InventorySystem`
2. In `create()`, instantiate and add to SystemManager, passing registry and playerSystem
3. Pass to LootSystem via its init config

```typescript
// In imports
import { InventorySystem } from '../systems/InventorySystem';

// In create()
const inventorySystem = new InventorySystem();
const lootSystem = new LootSystem();

this.systemManager.add(inventorySystem);
this.systemManager.add(lootSystem);

this.systemManager.initAll({
  scene: this,
  registry: this.gameRegistry,
  classId: this.classId,
  inputSystem,
  playerSystem,
  enemySystem,
  combatSystem,
  inventorySystem,    // <-- new
});

// Pass to lootSystem specifically
lootSystem.init({
  scene: this,
  playerSystem,
  enemySystem,
  registry: this.gameRegistry,
  inventorySystem,    // <-- new
});
```

- [ ] **Step 2: Wire pickup in LootSystem**

Change `LootSystem.ts`:
1. Add `inventorySystem` field
2. Accept it in init config
3. Replace `// TODO: Add to inventory (Phase 1.4.2)` with actual call

```typescript
// Add import
import type { InventorySystem } from './InventorySystem';

// Add field
private inventorySystem!: InventorySystem;

// In init, accept from config
if (cfg.inventorySystem) {
  this.inventorySystem = cfg.inventorySystem as InventorySystem;
}

// In checkPickup, replace the TODO:
if (this.inventorySystem) {
  const added = this.inventorySystem.addItem(gi.item);
  if (!added) {
    // Inventory full, item stays on ground — skip destroy
    logger.warn('Inventory full, item stays on ground', { itemId: gi.item.id });
    continue;
  }
}
gi.sprite.destroy();
gi.label.destroy();
this.groundItems.splice(i, 1);
logger.info('Item picked up', { itemId: gi.item.id, name: gi.item.name });
```

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `npx vitest run`
Expected: All 84+ tests pass

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/LootSystem.ts
git commit -m "feat: wire InventorySystem into GameScene and LootSystem pickup"
```

---

### Task 5: GameScene pause/resume + InventoryUIScene skeleton

**Files:**
- Create: `src/scenes/InventoryUIScene.ts`
- Modify: `src/scenes/GameScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create InventoryUIScene skeleton with pause/resume**

```typescript
// src/scenes/InventoryUIScene.ts
import Phaser from 'phaser';
import { Logger } from '../core/Logger';
import { InventorySystem } from '../systems/InventorySystem';
import { getRarityColor, getRarityHtmlColor } from '../entities/Item';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { GameRegistry } from '../core/GameRegistry';

const logger = Logger.forSystem('INVENTORY_UI');

export class InventoryUIScene extends Phaser.Scene {
  static readonly KEY = 'InventoryUIScene';

  private inventorySystem!: InventorySystem;
  private playerSystem!: PlayerSystem;
  private registry!: GameRegistry;

  private inventoryVisible = false;
  private characterVisible = false;

  private lastKeyTime = 0;

  constructor() {
    super({ key: InventoryUIScene.KEY });
  }

  init(data: { inventorySystem: InventorySystem; playerSystem: PlayerSystem; registry: GameRegistry }): void {
    this.inventorySystem = data.inventorySystem;
    this.playerSystem = data.playerSystem;
    this.registry = data.registry;
    this.inventoryVisible = false;
    this.characterVisible = false;
  }

  create(): void {
    this.setupInput();
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      const now = performance.now();
      if (now - this.lastKeyTime < 100) return; // debounce
      this.lastKeyTime = now;

      if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        this.toggleInventory();
      }
      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        this.toggleCharacter();
      }
    });
  }

  private toggleInventory(): void {
    this.inventoryVisible = !this.inventoryVisible;
    this.updatePause();
    logger.info('Inventory toggled', { visible: this.inventoryVisible });
  }

  private toggleCharacter(): void {
    this.characterVisible = !this.characterVisible;
    this.updatePause();
    logger.info('Character sheet toggled', { visible: this.characterVisible });
  }

  private updatePause(): void {
    const gameScene = this.scene.get('GameScene');
    if (this.inventoryVisible || this.characterVisible) {
      gameScene.scene.pause();
    } else {
      gameScene.scene.resume();
    }
  }
}
```

- [ ] **Step 2: Wire into GameScene**

In `GameScene.create()` after the `this.scene.launch(DebugOverlayScene.KEY);` line:

```typescript
this.scene.launch(InventoryUIScene.KEY, {
  inventorySystem,
  playerSystem,
  registry: this.gameRegistry,
});
```

Add import:

```typescript
import { InventoryUIScene } from './InventoryUIScene';
```

- [ ] **Step 3: Register in main.ts**

```typescript
import { InventoryUIScene } from './scenes/InventoryUIScene';

scene: [BootScene, MainMenuScene, ClassSelectScene, GameScene, DebugOverlayScene, InventoryUIScene],
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/scenes/InventoryUIScene.ts src/scenes/GameScene.ts src/main.ts
git commit -m "feat: InventoryUIScene skeleton with pause/resume and key toggles"
```

---

### Task 6: InventoryUIScene — Render Inventory Panel

**Files:**
- Modify: `src/scenes/InventoryUIScene.ts`

- [ ] **Step 1: Add rendering fields and createUI method**

```typescript
// Add fields
private inventoryBg!: Phaser.GameObjects.Rectangle;
private inventoryTitle!: Phaser.GameObjects.Text;
private slotRects: Phaser.GameObjects.Rectangle[] = [];
private itemRects: Phaser.GameObjects.Rectangle[] = [];  // recreated each frame
private itemLabels: Phaser.GameObjects.Text[] = [];
private goldText!: Phaser.GameObjects.Text;
private closeHint!: Phaser.GameObjects.Text;

private static readonly PANEL_W = 700;
private static readonly PANEL_H = 560;
private static readonly SLOT_SIZE = 52;
private static readonly SLOT_GAP = 4;
private static readonly GRID_ORIGIN_X = 822;  // centered: (1920-700)/2 + (700-276)/2 = 610 + 212 = 822
private static readonly GRID_ORIGIN_Y = 320;  // (1080-560)/2 + 60 padding = 260 + 60 = 320
```

- [ ] **Step 2: Build inventory panel UI**

```typescript
private createInventoryPanel(): void {
  const cx = 960; // center x
  const cy = 540; // center y
  const px = cx - InventoryUIScene.PANEL_W / 2;
  const py = cy - InventoryUIScene.PANEL_H / 2;

  // Background
  this.inventoryBg = this.add.rectangle(cx, cy, InventoryUIScene.PANEL_W, InventoryUIScene.PANEL_H, 0x0d0d0d, 0.95)
    .setScrollFactor(0).setDepth(200000).setVisible(false);

  // Border
  this.add.rectangle(cx, cy, InventoryUIScene.PANEL_W, InventoryUIScene.PANEL_H)
    .setScrollFactor(0).setDepth(200001).setStrokeStyle(1, 0x1a1a2e).setFillStyle(undefined, 0).setVisible(false);

  // Title
  this.inventoryTitle = this.add.text(cx, py + 24, 'INVENTORY', {
    color: '#cccccc', fontSize: '24px', fontFamily: 'monospace',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);

  // Slots
  const gx = InventoryUIScene.GRID_ORIGIN_X;
  const gy = InventoryUIScene.GRID_ORIGIN_Y;
  for (let row = 0; row < InventorySystem.ROWS; row++) {
    for (let col = 0; col < InventorySystem.COLS; col++) {
      const x = gx + col * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
      const y = gy + row * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
      const slot = this.add.rectangle(
        x + InventoryUIScene.SLOT_SIZE / 2,
        y + InventoryUIScene.SLOT_SIZE / 2,
        InventoryUIScene.SLOT_SIZE,
        InventoryUIScene.SLOT_SIZE,
        0x0d0d0d, 1,
      ).setScrollFactor(0).setDepth(200002).setStrokeStyle(1, 0x1a1a2e).setVisible(false);
      this.slotRects.push(slot);
    }
  }

  // Gold
  this.goldText = this.add.text(cx, py + InventoryUIScene.PANEL_H - 50, '', {
    color: '#c9a84c', fontSize: '18px', fontFamily: 'monospace',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);

  // Close hint
  this.closeHint = this.add.text(cx, py + InventoryUIScene.PANEL_H - 24, 'Press I to close', {
    color: '#555555', fontSize: '14px', fontFamily: 'monospace',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);
}
```

- [ ] **Step 3: Add render method that redraws items**

```typescript
private renderInventory(): void {
  if (!this.inventoryVisible) return;
  this.goldText.setText(`Gold: ${this.inventorySystem.getGold()}`);

  // Clear previous item visuals
  for (const r of this.itemRects) r.destroy();
  for (const l of this.itemLabels) l.destroy();
  this.itemRects = [];
  this.itemLabels = [];

  const gx = InventoryUIScene.GRID_ORIGIN_X;
  const gy = InventoryUIScene.GRID_ORIGIN_Y;
  const slots = this.inventorySystem.getInventorySlots();
  const seen = new Set<string>();

  for (let row = 0; row < InventorySystem.ROWS; row++) {
    for (let col = 0; col < InventorySystem.COLS; col++) {
      const item = slots[row * InventorySystem.COLS + col];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      const sx = gx + col * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
      const sy = gy + row * (InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP);
      const sw = item.gridW * InventoryUIScene.SLOT_SIZE + (item.gridW - 1) * InventoryUIScene.SLOT_GAP;
      const sh = item.gridH * InventoryUIScene.SLOT_SIZE + (item.gridH - 1) * InventoryUIScene.SLOT_GAP;

      const color = getRarityColor(item.rarity);
      const rect = this.add.rectangle(
        sx + sw / 2, sy + sh / 2, sw, sh, color, 0.85,
      ).setScrollFactor(0).setDepth(200003).setVisible(true).setStrokeStyle(1, color);

      const label = this.add.text(sx + sw / 2, sy + sh + 2, item.name, {
        color: '#cccccc', fontSize: '10px', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200004).setVisible(true);

      this.itemRects.push(rect);
      this.itemLabels.push(label);
    }
  }
}

// Import getRarityColor from entities/Item.ts instead of duplicating
```

- [ ] **Step 4: Wire visibility into toggleInventory**

```typescript
private toggleInventory(): void {
  this.inventoryVisible = !this.inventoryVisible;
  this.inventoryBg.setVisible(this.inventoryVisible);
  this.inventoryTitle.setVisible(this.inventoryVisible);
  this.goldText.setVisible(this.inventoryVisible);
  this.closeHint.setVisible(this.inventoryVisible);
  for (const s of this.slotRects) s.setVisible(this.inventoryVisible);
  if (this.inventoryVisible) {
    this.renderInventory();
  } else {
    for (const r of this.itemRects) r.destroy();
    for (const l of this.itemLabels) l.destroy();
    this.itemRects = [];
    this.itemLabels = [];
  }
  this.updatePause();
}
```

- [ ] **Step 5: Call createInventoryPanel in create()**

```typescript
create(): void {
  this.createInventoryPanel();
  this.setupInput();
}
```

- [ ] **Step 6: Run tests + verify**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/scenes/InventoryUIScene.ts
git commit -m "feat: InventoryUIScene renders inventory grid with items"
```

---

### Task 7: InventoryUIScene — Character Sheet Panel

**Files:**
- Modify: `src/scenes/InventoryUIScene.ts`

- [ ] **Step 1: Add character sheet rendering fields**

```typescript
// Additional fields
private charBg!: Phaser.GameObjects.Rectangle;
private charTitle!: Phaser.GameObjects.Text;
private equipSlotRects: Phaser.GameObjects.Rectangle[] = [];
private equipSlotLabels: Phaser.GameObjects.Text[] = [];
private equipItemRects: Phaser.GameObjects.Rectangle[] = [];
private equipItemLabels: Phaser.GameObjects.Text[] = [];
private statsText!: Phaser.GameObjects.Text;
private charCloseHint!: Phaser.GameObjects.Text;

private static readonly CHAR_PANEL_W = 500;
private static readonly CHAR_PANEL_H = 580;
private static readonly EQUIP_SLOT_SIZE = 64;
private static readonly EQUIP_LEFT_X = 740;   // (1920-500)/2 + 30
private static readonly EQUIP_RIGHT_X = 740 + 64 + 12;
private static readonly EQUIP_START_Y = 310;  // 250 + 60
private static readonly EQUIP_ROW_H = 92;     // 64 + 8 gap + 20 label
private static readonly STATS_X = 910;        // 710 + 200
private static readonly STATS_START_Y = 300;
```

- [ ] **Step 2: Build character sheet panel**

```typescript
private createCharacterPanel(): void {
  const cx = 960;
  const cy = 540;
  const px = cx - InventoryUIScene.CHAR_PANEL_W / 2;
  const py = cy - InventoryUIScene.CHAR_PANEL_H / 2;

  // Background
  this.charBg = this.add.rectangle(cx, cy, InventoryUIScene.CHAR_PANEL_W, InventoryUIScene.CHAR_PANEL_H, 0x0d0d0d, 0.95)
    .setScrollFactor(0).setDepth(200000).setVisible(false);
  this.add.rectangle(cx, cy, InventoryUIScene.CHAR_PANEL_W, InventoryUIScene.CHAR_PANEL_H)
    .setScrollFactor(0).setDepth(200001).setStrokeStyle(1, 0x1a1a2e).setFillStyle(undefined, 0).setVisible(false);

  // Title
  this.charTitle = this.add.text(cx, py + 24, 'CHARACTER', {
    color: '#cccccc', fontSize: '24px', fontFamily: 'monospace',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);

  // Equipment slots — 2 columns × 5 rows
  const slotIds = ['main_hand', 'off_hand', 'body', 'helm', 'gloves', 'boots', 'ring_1', 'ring_2', 'amulet', 'belt'];
  const slotLabels: Record<string, string> = {
    main_hand: 'Main Hand', off_hand: 'Off Hand', body: 'Body', helm: 'Helm',
    gloves: 'Gloves', boots: 'Boots', ring_1: 'Ring 1', ring_2: 'Ring 2',
    amulet: 'Amulet', belt: 'Belt',
  };

  for (let i = 0; i < slotIds.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? InventoryUIScene.EQUIP_LEFT_X : InventoryUIScene.EQUIP_RIGHT_X;
    const y = InventoryUIScene.EQUIP_START_Y + row * InventoryUIScene.EQUIP_ROW_H;

    const slot = this.add.rectangle(x, y, InventoryUIScene.EQUIP_SLOT_SIZE, InventoryUIScene.EQUIP_SLOT_SIZE, 0x0d0d0d, 1)
      .setScrollFactor(0).setDepth(200002).setStrokeStyle(1, 0x1a1a2e).setVisible(false);
    this.equipSlotRects.push(slot);

    const label = this.add.text(x, y + InventoryUIScene.EQUIP_SLOT_SIZE / 2 + 2, slotLabels[slotIds[i]], {
      color: '#666666', fontSize: '10px', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200003).setVisible(false);
    this.equipSlotLabels.push(label);
  }

  // Stats
  this.statsText = this.add.text(InventoryUIScene.STATS_X, InventoryUIScene.STATS_START_Y, '', {
    color: '#cccccc', fontSize: '14px', fontFamily: 'monospace', lineSpacing: 4,
  }).setScrollFactor(0).setDepth(200002).setVisible(false);

  // Close hint
  this.charCloseHint = this.add.text(cx, py + InventoryUIScene.CHAR_PANEL_H - 24, 'Press C to close', {
    color: '#555555', fontSize: '14px', fontFamily: 'monospace',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(200001).setVisible(false);
}
```

- [ ] **Step 3: Add renderCharacter method**

```typescript
private renderCharacter(): void {
  if (!this.characterVisible) return;

  // Clear previous equipment item visuals
  for (const r of this.equipItemRects) r.destroy();
  for (const l of this.equipItemLabels) l.destroy();
  this.equipItemRects = [];
  this.equipItemLabels = [];

  // Render equipped items
  const equipment = this.inventorySystem.getEquipment();
  const slotIds = ['main_hand', 'off_hand', 'body', 'helm', 'gloves', 'boots', 'ring_1', 'ring_2', 'amulet', 'belt'];

  for (let i = 0; i < slotIds.length; i++) {
    const slotId = slotIds[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? InventoryUIScene.EQUIP_LEFT_X : InventoryUIScene.EQUIP_RIGHT_X;
    const y = InventoryUIScene.EQUIP_START_Y + row * InventoryUIScene.EQUIP_ROW_H;
    const item = equipment.get(slotId as EquipmentSlotId) ?? null;

    if (item) {
      const color = getRarityColor(item.rarity);
      const rect = this.add.rectangle(x, y, InventoryUIScene.EQUIP_SLOT_SIZE, InventoryUIScene.EQUIP_SLOT_SIZE, color, 0.85)
        .setScrollFactor(0).setDepth(200003).setVisible(true).setStrokeStyle(2, color);
      this.equipItemRects.push(rect);

      const label = this.add.text(x, y + InventoryUIScene.EQUIP_SLOT_SIZE / 2 + 2, item.name, {
        color: '#cccccc', fontSize: '9px', fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200004).setVisible(true);
      this.equipItemLabels.push(label);
    }
  }

  // Update stats
  const player = this.playerSystem.getPlayer();
  const statsStr =
    `Level: ${player.level}\n` +
    `HP: ${player.health}/${player.maxHealth}\n` +
    `Resource: ${player.resource}/${player.maxResource}\n` +
    `\n` +
    `Str: ${player.strength ?? 0}\n` +
    `Dex: ${player.dexterity ?? 0}\n` +
    `Int: ${player.intelligence ?? 0}\n` +
    `\n` +
    `Armour: ${player.armour ?? 0}\n` +
    `Evasion: ${player.evasion ?? 0}`;
  this.statsText.setText(statsStr);
}
```

Note: The player entity doesn't have strength/dexterity/intelligence fields yet. Add them to `PlayerEntity`:

```typescript
// In PlayerEntity.ts interface and createPlayerEntity
strength: number;
dexterity: number;
intelligence: number;
armour: number;
evasion: number;
```

- [ ] **Step 4: Wire visibility into toggleCharacter**

```typescript
private toggleCharacter(): void {
  this.characterVisible = !this.characterVisible;
  this.charBg.setVisible(this.characterVisible);
  this.charTitle.setVisible(this.characterVisible);
  this.statsText.setVisible(this.characterVisible);
  this.charCloseHint.setVisible(this.characterVisible);
  for (const s of this.equipSlotRects) s.setVisible(this.characterVisible);
  for (const l of this.equipSlotLabels) l.setVisible(this.characterVisible);
  if (this.characterVisible) {
    this.renderCharacter();
  } else {
    for (const r of this.equipItemRects) r.destroy();
    for (const l of this.equipItemLabels) l.destroy();
    this.equipItemRects = [];
    this.equipItemLabels = [];
  }
  this.updatePause();
}
```

- [ ] **Step 5: Wire createCharacterPanel in create()**

```typescript
create(): void {
  this.createInventoryPanel();
  this.createCharacterPanel();
  this.setupInput();
}
```

- [ ] **Step 6: Run tests + verify**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/scenes/InventoryUIScene.ts src/entities/PlayerEntity.ts
git commit -m "feat: InventoryUIScene character sheet with equipment and stats"
```

---

### Task 8: InventoryUIScene — Drag & Drop + Tooltips

**Files:**
- Modify: `src/scenes/InventoryUIScene.ts`

- [ ] **Step 1: Add drag state fields**

```typescript
private dragState: {
  item: Item;
  originCol: number;
  originRow: number;
  ghost: Phaser.GameObjects.Rectangle | null;
  ghostLabel: Phaser.GameObjects.Text | null;
} | null = null;

private tooltipBg!: Phaser.GameObjects.Rectangle;
private tooltipText!: Phaser.GameObjects.Text;

private hoveredItem: Item | null = null;
```

- [ ] **Step 2: Create tooltip setup + render methods**

```typescript
private createTooltip(): void {
  this.tooltipBg = this.add.rectangle(0, 0, 1, 1, 0x0d0d0d, 0.95)
    .setScrollFactor(0).setDepth(200010).setVisible(false).setStrokeStyle(1, 0x1a1a2e);
  this.tooltipText = this.add.text(0, 0, '', {
    color: '#cccccc', fontSize: '12px', fontFamily: 'monospace', lineSpacing: 2,
    wordWrap: { width: 260 },
  }).setScrollFactor(0).setDepth(200011).setVisible(false);
}

private showTooltip(item: Item, screenX: number, screenY: number): void {
  const plainLines: string[] = [];

  const htmlColor = getRarityHtmlColor(item.rarity);
  plainLines.push(`[${item.rarity.toUpperCase()}] ${item.name}`);
  plainLines.push(`${item.slot} ${item.subtype}`);
  plainLines.push('────────────────');

  if (item.implicit) {
    plainLines.push(item.implicit.label ?? `${item.implicit.statKey}: +${item.implicit.value}`);
  }

  for (const affix of item.affixes) {
    plainLines.push(affix.label ?? `${affix.affixId}: ${affix.value}`);
  }

  if (item.requirements && Object.keys(item.requirements).length > 0) {
    plainLines.push('────────────────');
    const player = this.playerSystem.getPlayer();
    for (const [stat, val] of Object.entries(item.requirements)) {
      const playerVal = (player as any)[stat] ?? 0;
      const mark = playerVal >= val ? '' : '⚠ ';
      plainLines.push(`${mark}Requires ${stat}: ${val}`);
    }
  }

  plainLines.push('────────────────');
  plainLines.push(`Item Level: ${item.ilvl}`);

  this.tooltipText.setText(plainLines.join('\n'));
  this.tooltipText.setColor('#cccccc');

  // Position
  const pad = 8;
  const tw = this.tooltipText.width + pad * 2;
  const th = this.tooltipText.height + pad * 2;
  let tx = screenX + 16;
  let ty = screenY + 16;

  // Keep within bounds
  const cam = this.cameras.main;
  if (tx + tw > cam.width) tx = screenX - tw - 16;
  if (ty + th > cam.height) ty = screenY - th - 16;

  this.tooltipBg.setPosition(tx + tw / 2, ty + th / 2);
  this.tooltipBg.setSize(tw, th);
  this.tooltipText.setPosition(tx + pad, ty + pad);
  this.tooltipBg.setVisible(true);
  this.tooltipText.setVisible(true);
}

// Import getRarityHtmlColor from entities/Item.ts instead of duplicating

private hideTooltip(): void {
  this.tooltipBg.setVisible(false);
  this.tooltipText.setVisible(false);
  this.hoveredItem = null;
}
```

- [ ] **Step 3: Add inventory click + drag handling**

```typescript
private setupInventoryInput(): void {
  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (!this.inventoryVisible) return;
    const col = this.screenToGridCol(pointer.x);
    const row = this.screenToGridRow(pointer.y);
    if (col === -1 || row === -1) return;

    const item = this.inventorySystem.getItemAtCell(col, row);
    if (!item) return;

    // Pick up item
    this.dragState = {
      item,
      originCol: col,
      originRow: row,
      ghost: null,
      ghostLabel: null,
    };
    this.inventorySystem.removeItem(item.id);
    this.renderInventory();
  });

  this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    // Update drag ghost position
    if (this.dragState) {
      if (!this.dragState.ghost) {
        this.dragState.ghost = this.add.rectangle(pointer.x, pointer.y, 32, 32, 0xffffff, 0.6)
          .setScrollFactor(0).setDepth(200020);
        this.dragState.ghostLabel = this.add.text(pointer.x, pointer.y + 18, this.dragState.item.name, {
          color: '#cccccc', fontSize: '10px', fontFamily: 'monospace',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200021);
      } else {
        this.dragState.ghost.setPosition(pointer.x, pointer.y);
        if (this.dragState.ghostLabel) this.dragState.ghostLabel.setPosition(pointer.x, pointer.y + 18);
      }

      // Show/hide placement hints
      const col = this.screenToGridCol(pointer.x);
      const row = this.screenToGridRow(pointer.y);
      if (col >= 0 && row >= 0) {
        // Could add green/red highlight on target slots
      }
    }

    // Hover tooltip for inventory items (not during drag)
    if (!this.dragState && this.inventoryVisible && !this.characterVisible) {
      const col = this.screenToGridCol(pointer.x);
      const row = this.screenToGridRow(pointer.y);
      const item = (col >= 0 && row >= 0) ? this.inventorySystem.getItemAtCell(col, row) : null;
      if (item && item !== this.hoveredItem) {
        this.showTooltip(item, pointer.x, pointer.y);
        this.hoveredItem = item;
      } else if (!item && this.hoveredItem) {
        this.hideTooltip();
      }
    }

    // Hover tooltip for equipment
    if (!this.dragState && this.characterVisible) {
      const equipSlot = this.screenToEquipSlot(pointer.x, pointer.y);
      if (equipSlot) {
        const item = this.inventorySystem.getEquipment().get(equipSlot) ?? null;
        if (item && item !== this.hoveredItem) {
          this.showTooltip(item, pointer.x, pointer.y);
          this.hoveredItem = item;
        } else if (!item && this.hoveredItem) {
          this.hideTooltip();
        }
      }
    }
  });

  this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    if (!this.dragState) return;

    // Destroy ghost
    if (this.dragState.ghost) this.dragState.ghost.destroy();
    if (this.dragState.ghostLabel) this.dragState.ghostLabel.destroy();

    // Determine target
    const col = this.screenToGridCol(pointer.x);
    const row = this.screenToGridRow(pointer.y);
    const equipSlot = this.screenToEquipSlot(pointer.x, pointer.y);

    if (col >= 0 && row >= 0) {
      // Try to place in inventory grid
      this.inventorySystem.moveItem(this.dragState.item.id, col, row);
    } else if (equipSlot) {
      // Try to equip
      this.inventorySystem.equipItem(this.dragState.item.id);
      // If equip fails, try to return to origin
      if (this.inventorySystem.getItemAtCell(0, 0) === null) {
        // item was removed from inventory but equip failed — return it
        this.inventorySystem.addItem(this.dragState.item);
      }
    } else {
      // Return to original position
      this.inventorySystem.addItem(this.dragState.item);
    }

    this.dragState = null;
    this.renderInventory();
    if (this.characterVisible) this.renderCharacter();
  });
}

private screenToGridCol(sx: number): number {
  const gx = InventoryUIScene.GRID_ORIGIN_X;
  const cellSize = InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP;
  const col = Math.floor((sx - gx) / cellSize);
  if (col < 0 || col >= InventorySystem.COLS) return -1;
  return col;
}

private screenToGridRow(sy: number): number {
  const gy = InventoryUIScene.GRID_ORIGIN_Y;
  const cellSize = InventoryUIScene.SLOT_SIZE + InventoryUIScene.SLOT_GAP;
  const row = Math.floor((sy - gy) / cellSize);
  if (row < 0 || row >= InventorySystem.ROWS) return -1;
  return row;
}

private screenToEquipSlot(sx: number, sy: number): EquipmentSlotId | null {
  const slotIds: EquipmentSlotId[] = ['main_hand', 'off_hand', 'body', 'helm', 'gloves', 'boots', 'ring_1', 'ring_2', 'amulet', 'belt'];
  for (let i = 0; i < slotIds.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? InventoryUIScene.EQUIP_LEFT_X : InventoryUIScene.EQUIP_RIGHT_X;
    const y = InventoryUIScene.EQUIP_START_Y + row * InventoryUIScene.EQUIP_ROW_H;
    const half = InventoryUIScene.EQUIP_SLOT_SIZE / 2;
    if (sx >= x - half && sx < x + half && sy >= y - half && sy < y + half) {
      return slotIds[i];
    }
  }
  return null;
}
```

- [ ] **Step 4: Wire tooltip and input into create()**

```typescript
create(): void {
  this.createInventoryPanel();
  this.createCharacterPanel();
  this.createTooltip();
  this.setupInput();
  this.setupInventoryInput();
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/scenes/InventoryUIScene.ts
git commit -m "feat: drag-drop, tooltips, and inventory input handling"
```

---

### Task 9: Manual verification and final testing

- [ ] **Step 1: Build and verify compile**

Run: `npx vitest run`
Expected: All tests pass (84 + new tests)

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`
Expected: Game starts, press I to open inventory panel centered, items render correctly, drag works, press C opens character sheet

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "Phase 1.4.2: inventory grid, character sheet, drag-drop, tooltips"
```
