# ASHFALL — Phase 1.4.3: HUD (Health, Resource, XP, Potion Belt)

**Date:** 2026-06-07
**Status:** Design approved

## Overview

Add a permanent heads-up display to the gameplay screen: health bar, resource bar, XP bar, potion belt, and gold display. Also reposition the inventory/character panels to left/right halves so they don't overlap.

## Architecture

A single `HUDScene` (Phaser.Scene) launches alongside `GameScene`, always visible, no toggle. Gets direct references to `PlayerSystem` and `InventorySystem` via init data. Reads data every frame via `update()` loop — no events needed.

**Files:**
- Create: `src/scenes/HUDScene.ts`
- Modify: `src/scenes/GameScene.ts` — launch HUDScene
- Modify: `src/main.ts` — register HUDScene
- Modify: `src/scenes/InventoryUIScene.ts` — reposition panels to left/right halves

## Visual Design (60-30-10 Rule)

| Role | Color | Usage |
|---|---|---|
| 60% Dominant | `#0d0d0d` | Bar backgrounds, empty potion slots, HUD container |
| 30% Secondary | `#1a1a1a` / `#cccccc` | Bar borders, text labels, slot frames |
| 10% Accent | Various (see below) | HP fill, RES fill, XP fill, gold text |

### Bar Colors

| Bar | Light (top gradient) | Dark (bottom gradient) |
|---|---|---|
| HP | `#ff5555` | `#991111` |
| Rage (resource) | `#ee5500` | `#771100` |
| Stamina (resource) | `#55cc44` | `#115511` |
| XP | `#ffdd44` | `#885500` |

### Depth Technique

Each bar uses 4-5 layers of Phaser Graphics to create a polished, modern look:
1. Drop shadow (2px offset, dark)
2. Outer border + rounded rect frame
3. Inner bevel line
4. Gradient fill with specular highlight at the fill top
5. Text overlay, centered

## Layout

### HUD (bottom-center, always visible)

```
                                     1920
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                                                                          │
  │                          (gameplay area)                                 │
  │                                                                          │
  │  ┌────────────┐  ┌──────────────────────────┐  ┌────────────┐  ┌─────┐  │
  │  │ HP  100/120│  │  Lv.1  45/100 XP  ★★★★★   │  │ ⚡ 85/100 │  │ █ █ │  │
  │  │ ▓▓▓▓▓▓░░░░ │  │  ▓▓▓▓░░░░░░░░░░░░░░░░░   │  │ ▓▓▓▓▓▓░░░░ │  │ █ █ │  │
  │  └────────────┘  └──────────────────────────┘  └────────────┘  └─────┘  │
  │                                                                          │
  └──────────────────────────────────────────────────────────────────────────┘
```

### Exact Coordinates

| Element | X | Y | Width | Height |
|---|---|---|---|---|
| HP bar | 680 (left-of-center) | 1010 | 240 | 36 |
| Resource bar | 1000 | 1010 | 240 | 36 |
| XP bar | 960 (center) | 1050 | 460 | 20 |
| Potion slots | 1280 | 1016 | 5×28 | 28 |
| Gold display | 1320 | 1056 | auto | auto |

### Inventory Panel Reposition

Change from centered to left/right halves:
- **Inventory panel (`I`):** Left half, center x = 480, grid origin adjusted accordingly
- **Character sheet (`C`):** Right half, center x = 1440, equipment slot X positions recalculated

## Implementation Details

### Graphics Objects (per HUDScene)

```typescript
private hpBg!: Phaser.GameObjects.Graphics;
private hpFill!: Phaser.GameObjects.Graphics;
private hpText!: Phaser.GameObjects.Text;

private resBg!: Phaser.GameObjects.Graphics;
private resFill!: Phaser.GameObjects.Graphics;
private resText!: Phaser.GameObjects.Text;

private xpBg!: Phaser.GameObjects.Graphics;
private xpFill!: Phaser.GameObjects.Graphics;
private xpSegments!: Phaser.GameObjects.Graphics;
private xpText!: Phaser.GameObjects.Text;

private potionSlots: Phaser.GameObjects.Graphics[] = [];
private goldText!: Phaser.GameObjects.Text;
```

### Bar Fill Rendering

```typescript
private drawFill(g: Graphics, x: number, y: number, w: number, h: number,
                 ratio: number, lightColor: number, darkColor: number): void {
  const fillW = Math.round(w * Math.max(0, Math.min(1, ratio)));
  g.clear();
  if (fillW <= 0) return;

  // Bottom gradient (darker)
  g.fillStyle(darkColor);
  g.fillRoundedRect(x, y, fillW, h, 4);

  // Top gradient (lighter, overlays top half)
  g.fillStyle(lightColor, 0.6);
  g.fillRoundedRect(x, y, fillW, h / 2, { tl: 4, tr: 4, bl: 0, br: 0 });

  // Specular highlight (glossy liquid surface effect)
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(x + 4, y + 2, fillW - 8, 2);
}
```

### Bar Background

```typescript
private drawBarBg(g: Graphics, x: number, y: number, w: number, h: number): void {
  g.clear();

  // Drop shadow
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x + 2, y + 2, w, h, 4);

  // Outer border + frame
  g.fillStyle(0x0d0d0d);
  g.fillRoundedRect(x, y, w, h, 4);

  // Inner bevel
  g.lineStyle(1, 0x333333);
  g.strokeRoundedRect(x, y, w, h, 4);

  // Inner dark line
  g.lineStyle(1, 0x1a1a1a);
  g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 4);
}
```

### XP Bar Segment Style

The XP bar is divided into 10 segments. Each segment is drawn at the same height with a small 1px gap between them. Filled segments use gold gradient, empty segments use dim outline.

### Resource Color by Class

```typescript
private getResourceColors(): { light: number; dark: number } {
  const player = this.playerSystem.getPlayer();
  switch (player.resourceType) {
    case 'rage': return { light: 0xee5500, dark: 0x771100 };
    case 'stamina': return { light: 0x55cc44, dark: 0x115511 };
    default: return { light: 0x4488ff, dark: 0x113388 };
  }
}
```

### Gold Display

Text showing current gold amount, positioned to the right of the potion belt:

```typescript
this.goldText = this.add.text(1320, 1056, 'Gold: 0', {
  color: '#c9a84c', fontSize: '12px', fontFamily: 'monospace',
}).setScrollFactor(0).setDepth(200100);
```

### HUD Update Loop

Every frame in `update()`:
1. Read `playerSystem.getPlayer()` — health, resource, level, XP
2. Calculate fill ratios
3. Redraw fill Graphics for HP, resource, and XP bars
4. Update text strings

### InventoryUIScene Reposition

Change from current centered layout to:
- **Inventory panel:** `const cx = 480` instead of `const cx = 960`
  - Grid origin shifts from (822, 320) to a left-aligned position
  - New constants: `INVENTORY_CX = 480`, `INVENTORY_PANEL_X = 130` (480 - 350)

- **Character panel:** `const cx = 1440` instead of `const cx = 960`
  - Equipment slots shift right
  - New constants: `CHARACTER_CX = 1440`, `CHARACTER_PANEL_X = 1190`
  - `EQUIP_LEFT_X` = 1190 + 30 = 1220
  - `EQUIP_RIGHT_X` = 1220 + 64 + 12 = 1296
  - `STATS_X` = 1190 + 200 = 1390

## Testing

- No new unit tests for HUDScene (pure Phaser rendering — manual verification)
- Existing 116 tests should all pass
- Verify: panels no longer overlap when both I+C open
- Verify: HUD bars render with correct colors for Ironclad and Ranger
- Verify: HP fill ratio matches player.health / player.maxHealth
