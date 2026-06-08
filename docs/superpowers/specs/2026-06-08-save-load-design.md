# Save & Load System — Design Spec

## Scope

Save only what exists today, add more as systems are built:
- PlayerEntity fields (class, position, stats, HP, resource, XP/level)
- InventorySystem (items, equipment, gold)
- SkillSystem (slot→skillId mappings)

## Save Data Schema

```typescript
interface SaveData {
  version: 1;
  timestamp: number;
  character: {
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
  };
  inventory: {
    gold: number;
    equipped: Record<string, SerializedItem | null>;
    bag: SerializedItem[];
  };
  skills: {
    slots: Record<string, string | null>;  // "q"/"e"/"r"/"f" → skillId
  };
}

interface SerializedItem {
  id: string;
  baseTypeId: string;
  rarity: string;
  name: string;
  slot: string;
  gridW: number;
  gridH: number;
  affixes: Array<{ id: string; name: string; tier: number }>;
  ilvl: number;
  originCol: number;
  originRow: number;
}
```

Omitted (future): currency, stash, waypoints, boss kills, settings, stats, passives.

## SaveSystem Architecture

### Location: `src/systems/SaveSystem.ts`

Implements `ISystem`, added to `SystemManager` in `GameScene.create()`.

### Dependency Injection (init config)

```typescript
init(config): void:
  receives: playerSystem, inventorySystem, skillSystem, inputSystem, scene
  subscribes: EventBus.on(SAVE_TRIGGERED, ...), on(PLAYER_LEVEL_UP, ...)
```

### API

```typescript
save(reason: string): boolean       // collect state → serialize → localStorage
load(): SaveData | null             // localStorage → parse → validate → return
static hasSave(): boolean           // localStorage key existence check (for MainMenu)
static validateSave(data: unknown): { valid: boolean; errors: string[] }  // §26.4
```

### Static `hasSave()` pattern

Called from MainMenuScene before SaveSystem is instantiated. Checks localStorage for `"ashfall_save_0"`.

## Save Triggers

| Trigger | Implementation |
|---|---|
| F5 pressed | InputSystem detects F5 press-and-release → emit SAVE_TRIGGERED. SaveSystem catches event → save("manual") |
| Level-up | LevelingSystem emits PLAYER_LEVEL_UP → SaveSystem catches → save("level_up") |

## Load Flow

```
BootScene
  → MainMenuScene.create()
      SaveSystem.hasSave()? → show "Continue" button
      "Continue" clicked:
        saveData = SaveSystem.load()
        if valid → scene.start('GameScene', { registry, classId: saveData.character.classId, saveData })
        if invalid → show "Save corrupted" error
      "New Game" → scene.start('ClassSelectScene', { registry })
  → GameScene.init(data)
        if data.saveData → store it
  → GameScene.create()
        systemManager.initAll({ ... normal refs ... })
        if saveData → restorePlayerState(), restoreInventory(), restoreSkills()
        else → normal fresh start at (960, 540)
```

### State Restoration Methods

- `PlayerSystem.restore(saveData.character)` — overwrite level, XP, HP, resource, position, attributes
- `InventorySystem.restore(saveData.inventory)` — clear defaults, set gold, set equipment map, repopulate bag items with stored positions
- `SkillSystem.restore(saveData.skills)` — clear defaults, set slot→skillId mappings (cooldowns reset to 0)

## Transient State (not saved)

- Enemy positions and AI state
- Cooldowns and shield state
- Projectiles and active skill effects
- Ground items (loot on ground)
- Active channeled skills
- Camera position (recalculates from player)
- Aim angle

## Error Handling (§26.4)

On load:
1. `validateSave()` checks every required field exists and has correct type
2. If invalid → log FATAL, do NOT apply partial data, show error on MainMenu
3. On success → emit SAVE_LOADED event, log at INFO

On save:
1. Try/catch around JSON.stringify + localStorage.setItem
2. On failure → emit SAVE_FAILED with error message
3. On success → emit SAVE_COMPLETE with byteSize + duration

## Scene Changes

### MainMenuScene
- New `continueButton` (Phaser.GameObjects.Text)
- Show only when `SaveSystem.hasSave()` returns true
- On click → saveData = SaveSystem.load() → if valid, `scene.start('GameScene', { registry, classId, saveData })`

### GameScene
- Accept optional `saveData` in init data
- After `systemManager.initAll()`, if saveData exists, call restore methods

## Testing Strategy

- **SaveSystem.test.ts**: serialize/deserialize round-trip, validateSave edge cases, corrupted JSON handling, auto-save on level-up event, manual save F5 trigger, missing systems don't break save
- **MainMenuScene test (if exists)**: Continue button visibility based on hasSave
- **GameScene test**: load path restores player position and inventory correctly
