# XP & Leveling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Award XP on enemy kills with level-up stat growth. HUD auto-updates.

**Architecture:** Single LevelingSystem (ISystem) listens to COMBAT_KILL, awards XP, handles level-ups.

**Tech Stack:** TypeScript, Vitest, EventBus

---

### Task 1: Data + LevelingSystem + Tests + Wiring

**Files:**
- Modify: `src/data/dataConfigs.ts`
- Modify: `public/data/classes.json`
- Create: `src/systems/LevelingSystem.ts`
- Create: `tests/systems/LevelingSystem.test.ts`
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add `baseStatsPerLevel` to ClassConfig**

In `src/data/dataConfigs.ts`, add to the ClassConfig interface:
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

- [ ] **Step 2: Add stat growth to classes.json**

Add `baseStatsPerLevel` to both classes:

Ironclad:
```json
"baseStatsPerLevel": { "health": 12, "strength": 2, "dexterity": 1, "armour": 1 }
```

Ranger:
```json
"baseStatsPerLevel": { "health": 8, "dexterity": 2, "strength": 1, "evasion": 1 }
```

- [ ] **Step 3: Create LevelingSystem**

`src/systems/LevelingSystem.ts`:
```typescript
import type { ISystem } from './ISystem';
import { Logger } from './Logger';
import { EventBus } from './EventBus';
import { GameEvent } from './GameEvent';
import type { GameRegistry } from './GameRegistry';
import type { PlayerSystem } from './PlayerSystem';

const logger = Logger.forSystem('LEVEL');

export class LevelingSystem implements ISystem {
  readonly name = 'LevelingSystem';
  readonly logger = Logger.forSystem('LEVEL');

  private playerSystem!: PlayerSystem;
  private registry!: GameRegistry;
  private didInit = false;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.playerSystem = cfg.playerSystem as PlayerSystem;
    this.registry = cfg.registry as GameRegistry;

    EventBus.getInstance().on(GameEvent.COMBAT_KILL, this.onKill, this);
    this.didInit = true;
    logger.info('Initialised');
  }

  destroy(): void {
    this.didInit = false;
    EventBus.getInstance().offAll(this);
  }

  update(): void {
    // no per-frame logic
  }

  private onKill(payload: any): void {
    if (!payload?.enemyConfigId) return;
    const enemyConfig = this.registry.enemies.getOrNull(payload.enemyConfigId);
    if (!enemyConfig) return;

    const xpGained = enemyConfig.xpReward;
    if (xpGained <= 0) return;

    const player = this.playerSystem.getPlayer();
    player.experience += xpGained;

    EventBus.getInstance().emit(GameEvent.PLAYER_XP_GAINED, { xpGained, total: player.experience, level: player.level });

    let leveledUp = false;
    while (player.experience >= player.experienceToNext) {
      player.experience -= player.experienceToNext;
      player.level++;
      this.applyLevelUp(player);
      player.experienceToNext = this.getXPToNextLevel(player.level);
      leveledUp = true;
    }

    if (leveledUp) {
      EventBus.getInstance().emit(GameEvent.PLAYER_LEVEL_UP, {
        newLevel: player.level,
        oldLevel: player.level - 1,
        totalXP: player.experience,
      });
    }
  }

  private applyLevelUp(player: any): void {
    const classConfig = this.registry.classes.get(player.classId);
    const growth = classConfig.baseStatsPerLevel ?? {};
    player.maxHealth += growth.health ?? 10;
    player.health = player.maxHealth;
    player.strength += growth.strength ?? 0;
    player.dexterity += growth.dexterity ?? 0;
    player.intelligence += growth.intelligence ?? 0;
    player.armour += growth.armour ?? 0;
    player.evasion += growth.evasion ?? 0;
    logger.info('Level up!', { level: player.level, maxHealth: player.maxHealth });
  }

  getXPToNextLevel(level: number): number {
    return Math.round(100 * level * 1.3);
  }
}
```

Note: The import paths are relative — they need to be adjusted for the actual file location at `src/systems/LevelingSystem.ts`. Use: `'../core/ISystem'`, `'../core/Logger'`, etc.

- [ ] **Step 4: Create LevelingSystem tests**

`tests/systems/LevelingSystem.test.ts`:
```typescript
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { EventBus } from '../../src/core/EventBus';
import { GameEvent } from '../../src/core/GameEvent';
import { GameRegistry } from '../../src/core/GameRegistry';
import { LevelingSystem } from '../../src/systems/LevelingSystem';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('LevelingSystem', () => {
  let system: LevelingSystem;
  let registry: GameRegistry;
  let player: any;

  function makeRegistry(): GameRegistry {
    const r = new GameRegistry();
    r.enemies.register('test_enemy', {
      id: 'test_enemy', name: 'Test', tier: 'normal', attackType: 'melee',
      baseHP: 10, baseDamage: 1, moveSpeed: 50, detectionRadius: 5,
      attackRange: 1, xpReward: 50,
      lootTable: { goldDrop: { min: 0, max: 0 }, itemDropChance: 0, itemTypeWeights: {} },
    });
    r.enemies.register('xp_empty', {
      id: 'xp_empty', name: 'No XP', tier: 'normal', attackType: 'melee',
      baseHP: 10, baseDamage: 1, moveSpeed: 50, detectionRadius: 5,
      attackRange: 1, xpReward: 0,
      lootTable: { goldDrop: { min: 0, max: 0 }, itemDropChance: 0, itemTypeWeights: {} },
    });
    r.classes.register('test_class', {
      id: 'test_class', name: 'Test Class', resourceType: 'rage',
      baseStats: { health: 100, maxResource: 100, resourceRegen: 0, moveSpeed: 185, strength: 10, dexterity: 10, intelligence: 10, armour: 5, critChance: 5, critMultiplier: 150 },
      startingSkillIds: [], passives: [],
      baseStatsPerLevel: { health: 10, strength: 2, dexterity: 1, armour: 1 },
    });
    return r;
  }

  beforeEach(() => {
    player = {
      classId: 'test_class', position: { x: 0, y: 0 }, facingAngle: 0, moveSpeed: 185,
      health: 100, maxHealth: 100, resource: 100, maxResource: 100, resourceType: 'rage',
      level: 1, experience: 0, experienceToNext: 130,
      strength: 10, dexterity: 10, intelligence: 10, armour: 5, evasion: 0,
    };
    registry = makeRegistry();
    system = new LevelingSystem();
    system.init({
      playerSystem: { getPlayer: () => player },
      registry,
    } as any);
  });

  it('awards XP on kill', () => {
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    expect(player.experience).toBe(50);
  });

  it('does not award XP for 0 xpReward enemies', () => {
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'xp_empty' });
    expect(player.experience).toBe(0);
  });

  it('triggers level-up when XP threshold reached', () => {
    player.experience = 100;
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    expect(player.level).toBe(2);
    expect(player.maxHealth).toBe(110);
    expect(player.strength).toBe(12);
    expect(player.armour).toBe(6);
    expect(player.health).toBe(110);
  });

  it('carries over excess XP on level-up', () => {
    player.experience = 110;
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    // With 50 XP at 130 threshold:
    // spend 130, remaining = 110 + 50 - 130 = 30
    expect(player.experience).toBe(30);
    expect(player.level).toBe(2);
  });

  it('supports multiple level-ups from one kill', () => {
    player.experience = 260; // 2x level 1 threshold
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, { enemyConfigId: 'test_enemy' });
    // 260 + 50 = 310. First: -130 = 180. Second: -260 = 20.
    expect(player.level).toBeGreaterThanOrEqual(2);
    expect(player.experience).toBe(20);
  });
});
```

- [ ] **Step 5: Wire LevelingSystem in GameScene**

In `src/scenes/GameScene.ts`:
1. Import: `import { LevelingSystem } from '../systems/LevelingSystem';`
2. In `create()`, before `this.systemManager.add(inventorySystem)`:
```typescript
const levelingSystem = new LevelingSystem();
this.systemManager.add(levelingSystem);
```
3. Add `levelingSystem` to the `initAll` config object.

- [ ] **Step 6: Run tests + TypeScript check**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/data/dataConfigs.ts public/data/classes.json src/systems/LevelingSystem.ts tests/systems/LevelingSystem.test.ts src/scenes/GameScene.ts
git commit -m "feat: XP and leveling system with class stat growth"
```

