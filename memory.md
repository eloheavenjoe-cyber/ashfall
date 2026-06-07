# ASHFALL — Session Memory

## Session 1 — Project Scaffold & Phase 1.1–1.4

### Setup
- Stack: Phaser 3 + TypeScript + Vite
- Testing: Vitest (84 tests)
- GitHub repo: `eloheavenjoe-cyber/ashfall`
- GitHub Pages: `https://eloheavenjoe-cyber.github.io/ashfall/`
- Auto-deploy via GitHub Actions on push to `main`

### Architecture Implemented

**Core Systems (sections 21-24):**
| System | File | Status |
|---|---|---|
| Logger (§21) | `src/core/Logger.ts` | Singleton, rolling 500-entry buffer, level filtering, per-system tags, `[HH:MM:SS.mmm] [LEVEL] [SYSTEM]` format |
| EventBus (§22) | `src/core/EventBus.ts` | `on`/`once`/`off`/`offAll` with error isolation, context-based cleanup, typed event constants in `GameEvent.ts` |
| ISystem (§23) | `src/core/ISystem.ts` | `init`/`update`/`destroy` lifecycle, optional hooks (`onSceneReady`, `onZoneLoad`, `onZoneExit`) |
| SystemManager | `src/core/SystemManager.ts` | Wraps ISystem lifecycle, error-safe `updateAll`, reverse-order `destroyAll` |
| GameRegistry (§24) | `src/core/GameRegistry.ts` | 12 typed registries with safe fallbacks, `register`/`get`/`getOrNull`/`has`/`count` |
| DataLoader (§24) | `src/core/dataLoader.ts` | Boot-time async JSON loading from `/data/` paths, fetch-based |

**Data Files (in `public/data/`):**
- `enemies.json` — 3 Act 1 enemies (hollow_husk, scabrous_rat, grave_archer)
- `items.json` — 6 base item types (weapons + armour)
- `affixes.json` — 10 affixes across T1-T5 (prefixes + suffixes with conflicts)
- `skills.json` — 10 skills (Ironclad + Ranger, all slots)
- `classes.json` — Ironclad + Ranger with base stats
- `zones.json` — 3 zones (town, forest, ruins) with enemy rosters
- `currency.json` — 11 currency items
- `passives.json` — 4 passive tree stubs

### Scene Flow
```
BootScene (load JSON data)
  → MainMenuScene (title + Play/Load)
    → ClassSelectScene (Ironclad / Ranger panels)
      → GameScene (gameplay)
```

### Phase 1.2 — Player Movement
- WASD 8-directional normalized movement, independent mouse aim
- Movement speed from class JSON (Ironclad 185, Ranger 220)
- Colored rect sprites (blue = Ironclad, green = Ranger) + aim line
- Camera with cursor lead (up to 64px)
- Depth sorting every frame by world Y

### Phase 1.3 — Combat & Enemies
- **EnemySystem:** AI state machine (idle → alert → attack_windup → attack_strike → attack_cooldown → dead)
  - Idle: wander with random direction changes every 2-3s
  - Alert: path toward player
  - Wind-up: 0.5s, sprite turns yellow
  - Strike: emit COMBAT_PLAYER_HIT with damage
  - Dead: fade out over 2s, then remove
  - Detection radius scaled from tiles to pixels (×32)
- **CombatSystem:** 
  - Ironclad: melee cone check (50px range, ±45° from aim angle)
  - Ranger: projectile spawning (500px/s, 2s lifetime, 20px collision radius)
  - Damage formula: `baseDamage × skillMultiplier × critMultiplier - armour`
  - 5% base crit chance, 1.5× crit multiplier
- **HitFeedbackSystem:**
  - Floating damage numbers (color-coded, rise 50px over 0.8s)
  - Enemy flash white on hit (80ms)
  - Screen shake (1px normal, 3px crit)
  - Death particle burst (6 rects, 400ms)
- Base damage: Ironclad=20, Ranger=15

### Phase 1.4.1 — Items & Loot
- **ItemGenerator:** Creates Normal/Magic/Rare items from base types + affixes
  - Affix rolling with ilvl tier gates (T1: ilvl 1+, T2: 10+, T3: 20+, T4: 35+, T5: 50+)
  - Weighted random selection, conflict resolution
  - Name building from prefix + base + suffix
  - Grid sizes for inventory (1×1 rings up to 2×3 two-handers)
- **LootSystem:** Listens for COMBAT_KILL, rolls drops per enemy JSON config
  - Gold drops from loot table
  - Item category selection (weapon/armour/accessory)
  - Ground items with rarity-colored sprite + text label
  - Auto-pickup on 30px walkover

### Debug Overlay (§25)
- F1 toggle panel: FPS, player info, zone info, last 8 log entries
- Dev console: 20 commands (help, godmode, givegold, setloglevel, etc.)
- `window.DEV` global for browser console access
- F2-F9 visual aid toggles (stubbed)

### Key Design Decisions
- EventBus is a singleton (`EventBus.getInstance()`) — all systems share one
- Systems communicate via EventBus, not direct references (except execution dependencies like InputSystem → CombatSystem)
- All game data in JSON via Registry pattern — no hardcoded values
- Isometric projection: 2:1 at 64×32 per tile
- Grid: single Graphics object (80×80 tiles, one draw call)
- Camera: infinite bounds, no clamping → supports large zones
- Enemy attack has wind-up animation before damage lands (0.5s)
- LMB held for continuous attacks (WASD only movement, no right-click)
- `registry` property conflicts with Phaser's built-in `DataManager.registry` — renamed to `gameRegistry` in scenes

### File Structure
```
src/
  core/         — Logger, EventBus, ISystem, GameRegistry, SystemManager, dataLoader, eventPayloads
  data/         — dataConfigs.ts (all game data TypeScript types)
  entities/     — PlayerEntity, Enemy, Item
  systems/      — InputSystem, PlayerSystem, EnemySystem, CombatSystem, HitFeedbackSystem, LootSystem, ItemGenerator
  scenes/       — Boot, MainMenu, ClassSelect, Game, DebugOverlay
  utils/        — damage.ts (calcDamage, applyMitigation)
  main.ts       — Phaser game entry point
  env.d.ts      — TypeScript declarations (IS_DEV)
public/data/    — 8 JSON config files
tests/          — 84 tests across 8 test files
```

### Phase 1.4.2 — Inventory & Equip UI (Completed)
- **InventorySystem** (`src/systems/InventorySystem.ts`): 40-slot grid (5×8), variable item sizes, occupancy-based placement, equip/unequip with slot matching, gold
- **InventoryUIScene** (`src/scenes/InventoryUIScene.ts`): Centered inventory panel with rarity-colored items, character sheet with 10 equipment slots + player stats, floating tooltips with affix/requirements display
- **Interaction**: `I` toggles inventory, `C` toggles character sheet, drag-drop + click-select, game pauses when panels open
- **PlayerEntity**: Added `strength`, `dexterity`, `intelligence`, `armour`, `evasion` fields populated from class config
- **Tests**: 32 new tests for grid math, placement, equip/unequip

### Phase 1.4.3 — HUD (Completed)
- **HUDScene** (`src/scenes/HUDScene.ts`): HP bar (gradient red), resource bar (rage=orange/stamina=green), XP bar (gold segments), 5-slot potion belt placeholder, gold display
- **Visual polish**: Drop shadows, gradient fills, specular highlights, rounded corners, outer border + inner bevel on all bars
- **Panel reposition**: Inventory opens left half (cx=480), character sheet right half (cx=1440) — no overlap
- **Integration**: Launched alongside GameScene, reads PlayerSystem/InventorySystem each frame

### Remaining Phases
- **1.5** — Polish & Progression (class skills, XP/leveling, full HUD, save/load)
