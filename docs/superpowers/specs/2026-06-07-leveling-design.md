# ASHFALL — Phase 1.5.2: XP & Leveling

**Date:** 2026-06-07
**Status:** Design approved

## Overview

Add XP rewards on enemy kills and a level-up system with class-specific stat growth. The HUD XP bar auto-updates from existing player entity fields.

## Architecture

New `LevelingSystem` (ISystem) listens for `COMBAT_KILL`, awards XP from `enemyConfig.xpReward`, and triggers level-ups. No changes to combatHelper, CombatSystem, PlayerSystem, or HUDScene.

**Files:**
- Create: `src/systems/LevelingSystem.ts`
- Modify: `src/data/dataConfigs.ts` — add `baseStatsPerLevel` to ClassConfig
- Modify: `public/data/classes.json` — add stat growth values
- Modify: `src/scenes/GameScene.ts` — register LevelingSystem
- Create: `tests/systems/LevelingSystem.test.ts`

## XP Formula

`experienceToNext = Math.round(100 * level * 1.3)`

| Level | XP to Next |
|---|---|
| 1 | 130 |
| 2 | 260 |
| 3 | 390 |
| 4 | 520 |
| 5 | 650 |

## Stat Growth (Class-Specific)

**Ironclad:** health +12, strength +2, dexterity +1, armour +1 per level
**Ranger:** health +8, dexterity +2, strength +1, evasion +1 per level

Added to classes.json as `baseStatsPerLevel` field.

## Data Changes

ClassConfig type:
```typescript
baseStatsPerLevel?: {
  health?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  armour?: number;
  evasion?: number;
};
```

## Leveling Logic

On `COMBAT_KILL`:
1. Look up `enemyConfig.xpReward` from registry
2. Add XP to `player.experience`
3. Emit `PLAYER_XP_GAINED` with xp gained
4. While `experience >= experienceToNext`:
   - Apply stat growth for new level
   - Increment level
   - Recalculate `experienceToNext`
   - Subtract used XP (keep overflow)
   - Emit `PLAYER_LEVEL_UP`
5. Restore health to new max on each level-up

## LevelingSystem API

```typescript
class LevelingSystem implements ISystem {
  private playerSystem: PlayerSystem;
  private registry: GameRegistry;

  init(config): subscribe to COMBAT_KILL
  destroy(): unsubscribe
  update(): no-op

  private onKill(payload): award XP, check level-up
  private applyLevelUp(player): apply stat growth, heal, emit
  private getXPToNextLevel(level): number
}
```

## Integration

- LevelingSystem added to GameScene's SystemManager
- HUD auto-updates XP bar
- No changes to CombatSystem, combatHelper, PlayerSystem, or HUDScene
