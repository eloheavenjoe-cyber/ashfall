# ASHFALL — Phase 1.4.2: Inventory & Equip UI

**Date:** 2026-06-07
**Status:** Design approved

## Overview

Add a full inventory grid (5×8, 40 slots) with variable-sized items and a 10-slot equipment character sheet. Uses separate overlay scene rendered above the game, inventory system for data/logic, EventBus for communication.

## Key Design Decisions

- **I** toggles inventory panel, **C** toggles character sheet panel – independent toggles
- Game pauses when either panel is open (`GameScene.scene.pause()`)
- Both drag & drop and click-select interactions
- Floating tooltip follows cursor on hover
- 60-30-10 color rule applied

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/systems/InventorySystem.ts` | Holds inventory grid, equipment, gold. Exposes query/mutate methods. Emits events. Implements `ISystem`. |
| `src/scenes/InventoryUIScene.ts` | Renders inventory panel + character sheet panel. Handles drag/click input. Listens for state-change events. Pauses/resumes `GameScene`. |

### Modified Files

| File | Change |
|---|---|
| `src/systems/LootSystem.ts` | Replace `TODO: Add to inventory` with `InventorySystem.addItem()` call |
| `src/scenes/GameScene.ts` | Add `InventorySystem` to `SystemManager`; launch `InventoryUIScene` |
| `src/main.ts` | Register `InventoryUIScene` in scene list |

### Data Flow

**Pickup:** LootSystem → InventorySystem.addItem() → INVENTORY_ITEM_ADDED event → UI re-renders
**Equip:** UI drag-to-slot → InventorySystem.equipItem() → INVENTORY_ITEM_EQUIPPED → UI re-renders both panels
**Drag/move:** UI drag-drop → InventorySystem.moveItem() → INVENTORY_ITEM_MOVED → UI re-renders
**Open/Close:**
- Press I → toggle inventory panel visibility
- Press C → toggle character sheet visibility
- If any panel visible → `GameScene.scene.pause()` (systems stop updating)
- If no panels visible → `GameScene.scene.resume()`

## Inventory Grid

- **Dimensions:** 5 columns × 8 rows = 40 slots
- **Each slot:** 52×52px, 4px gaps between slots
- **Grid visual size:** 276×444px
- Represented as flat Uint8Array[40] (`occupancy`), where each cell stores the flat index of the item occupying it (255 = empty)
- Items stored in a parallel `(Item & { originCol: number; originRow: number })[]` array

### Cell to Index Mapping

```
index = row × 5 + col
col = index % 5
row = floor(index / 5)
```

### Item Placement (variable sizes)

- Items have `gridW` × `gridH` (from `getItemGridSize()`)
- Occupies cells `[col, col+gridW) × [row, row+gridH)`
- `canPlaceAt(item, col, row)`: all cells in rectangle must be in-bounds (0≤col, col+gridW≤5, 0≤row, row+gridH≤8) and empty
- `findSlot(item)`: scan left-to-right, top-to-bottom for first valid position
- On pickup, `addItem(item)` auto-finds a slot; if no room, item stays on ground + `INVENTORY_FULL` event

### Drag & Drop with Variable Sizes

- **Pick up:** Click item → item removed from grid, ghost rect follows cursor (alpha 0.6, rarity-colored)
- **Hover over grid:** map cursor to nearest cell, check `canPlaceAt`
  - Valid → target cells glow green
  - Invalid → target cells glow red
- **Drop on valid cell:** place item there
- **Drop on invalid/outside:** cancel, return item to original position
- **Click-select fallback:** click item → "pick up" state → click destination → place

## Equipment Slots (10 total)

| Slot ID | Label | Accepts `item.slot` |
|---|---|---|
| `main_hand` | Main Hand | `main_hand` |
| `off_hand` | Off Hand | `off_hand` |
| `body` | Body Armour | `body` |
| `helm` | Helm | `helm` |
| `gloves` | Gloves | `gloves` |
| `boots` | Boots | `boots` |
| `ring_1` | Ring 1 | `ring` |
| `ring_2` | Ring 2 | `ring` |
| `amulet` | Amulet | `amulet` |
| `belt` | Belt | `belt` |

- Each slot: 64×64px, dark frame with slot label below
- Empty slots show slot name (dim text)
- Occupied slots show item with rarity color + item name below
- Drag item from inventory onto equipment slot → equip (if `item.slot` matches the slot's accepted value)
- Right-click equipped item → unequip (moves back to inventory if space available)

## Character Sheet Panel

- **Panel size:** 500×580, centered on screen
- **Left side:** 10 equipment slots, stacked vertically in 2 columns (5 per column)
- **Right side:** Player stats block
  - Level, HP (current/max), Resource (current/max)
  - Strength, Dexterity, Intelligence
  - Armour total, Evasion total
  - Damage range (min–max)
  - Crit chance (%)

## Visual Design (60-30-10 Rule)

| Role | Color | Usage |
|---|---|---|
| 60% Dominant | `#0d0d0d` | Panel backgrounds, empty slot fills |
| 30% Secondary | `#1a1a2e` / `#cccccc` | Slot borders, dividers, body text, slot frames |
| 10% Accent | Rarity colors, `#c9a84c` | Item fills, gold text, equipped glow, hover/drag indicators |

### Inventory Panel Layout

```
┌──────────────────────────────────────┐
│            INVENTORY                 │  ← #cccccc, 24px monospace, centered
│                                      │
│       5×8 slot grid (276×444)        │  ← centered in panel
│                                      │
│     Gold: 1,234                      │  ← icon + #c9a84c text
│                                      │
│            Press I to close          │  ← #555555, 14px
└──────────────────────────────────────┘
Panel dimensions: 700×560, centered on 1920×1080 canvas
```

### Character Sheet Layout

```
┌──────────────────────────────────────┐
│            CHARACTER                 │  ← #cccccc, 24px, centered
│                                      │
│  Equipment slots (left) │  Stats    │  ← two-column layout
│  ┌────────┐ ┌────────┐ │  Level: 1 │
│  │ Main H │ │ Off H  │ │  HP: 100  │
│  └────────┘ └────────┘ │  ...      │
│  ┌────────┐ ┌────────┐ │           │
│  │ Body   │ │ Helm   │ │           │
│  └────────┘ └────────┘ │           │
│  ┌────────┐ ┌────────┐ │           │
│  │ Gloves │ │ Boots  │ │           │
│  └────────┘ └────────┘ │           │
│  ┌────────┐ ┌────────┐ │           │
│  │ Ring 1 │ │ Ring 2 │ │           │
│  └────────┘ └────────┘ │           │
│  ┌────────┐ ┌────────┐ │           │
│  │ Amulet │ │ Belt   │ │           │
│  └────────┘ └────────┘ │           │
│                                      │
│            Press C to close          │
└──────────────────────────────────────┘
Panel dimensions: 500×580, centered
```

### Floating Tooltip

- Appears at cursor + offset(16, 16), bounded to screen edges
- Max width: 280px, auto-height
- Dark `#0d0d0d` background, 1px `#1a1a2e` border
- Content:
  - Item name (rarity-colored, 14px bold)
  - Base type + slot (12px dim)
  - Divider
  - Implicit stat (if any, blue-tinted)
  - Affixes list (each on own line, 12px)
  - Divider
  - Requirements (red if unmet, 12px)
  - Item level (dim, 12px)

## InventorySystem API

```typescript
class InventorySystem implements ISystem {
  // Query
  getGold(): number
  getInventorySlots(): (Item | null)[] // 40 slots, null=empty
  getEquipment(): Map<string, Item | null>
  getItemAtCell(col: number, row: number): Item | null
  canPlaceAt(item: Item, col: number, row: number): boolean
  isEquipped(itemId: string): boolean

  // Mutate
  addItem(item: Item): boolean          // auto-place, false if full
  removeItem(itemId: string): Item | null
  moveItem(fromCol: number, fromRow: number, toCol: number, toRow: number): boolean
  equipItem(itemId: string): boolean    // item→equipment slot, removes from inventory
  unequipItem(slotId: string): boolean  // equipment→inventory if space
  addGold(amount: number): void
}
```

## Events

Events from GameEvent.ts — emit on state changes:
- `INVENTORY_ITEM_ADDED` — { item }
- `INVENTORY_ITEM_REMOVED` — { itemId }
- `INVENTORY_ITEM_EQUIPPED` — { item, slotId }
- `INVENTORY_ITEM_UNEQUIPPED` — { item, slotId }
- `INVENTORY_ITEM_MOVED` — { itemId, fromSlot, toSlot }

## Edge Cases

1. **Inventory full on pickup:** Item stays on ground, emit `INVENTORY_FULL`, show brief notification
2. **Inventory full on unequip:** Can't unequip (show "Inventory full" notification), item stays equipped
3. **Requirements not met:** Item can be equipped but shows red requirement text in tooltip; in Phase 1.5 stats should penalize
4. **Swapping equipment:** Drag inventory item onto occupied equipment slot → swap: unequip current into inventory, equip new item
5. **Two-handed weapon in off_hand:** Two-handers occupy `main_hand` only; `off_hand` becomes locked (shown dimmed)
6. **Ring slot matching:** `ring_1` and `ring_2` both accept `slot === 'ring'` items; equip fills first empty ring slot
7. **Gold overflow:** Clamped to 9,999,999 maximum

## Testing

- Unit tests for `InventorySystem` grid math (`canPlaceAt`, `findSlot`, occupancy)
- Unit tests for equip/unequip logic, slot matching
- Unit tests for edge cases (full inventory, ring slot routing, two-hander offhand lock)
- No UI tests (pure Phaser rendering — manual verification)

## Implementation Order

1. `src/systems/InventorySystem.ts` — grid data structures, occupancy, placement, equip/unequip logic
2. `InventorySystem` tests — grid math, equip logic, edge cases
3. Wire `InventorySystem` into `GameScene.ts` + wire `LootSystem` pickup to inventory
4. `src/scenes/InventoryUIScene.ts` — render inventory panel, character sheet, tooltips, drag logic
5. Wire `InventoryUIScene` into `GameScene.ts` + register in `main.ts`
