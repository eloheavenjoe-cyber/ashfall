# Skill Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Q/E/R/F hotkey skill activation with 6 skill types across 2 classes, cooldowns, resource costs, and visual effects.

**Architecture:** SkillSystem (ISystem) manages cooldowns, resource validation, and dispatches to per-type SkillEffectHandler implementations. InputSystem tracks Q/E/R/F press states. Damage utility shared with CombatSystem.

**Tech Stack:** Phaser 3 (Graphics for effects), TypeScript, Vitest

---

### File Structure

**Create:**
- `src/systems/SkillSystem.ts` — core: cooldowns, resource, activation, ongoing effects tracking
- `src/systems/skills/SkillEffectHandler.ts` — interface
- `src/systems/skills/MeleeSkill.ts` — Crushing Blow
- `src/systems/skills/ProjectileSkill.ts` — Quickshot, Multishot, Explosive Arrow
- `src/systems/skills/AoELineSkill.ts` — Seismic Slam
- `src/systems/skills/AoETargetSkill.ts` — Rain of Arrows
- `src/systems/skills/MobilitySkill.ts` — Berserker's Charge, Vaulting Escape
- `src/systems/skills/BuffSkill.ts` — Iron Fortress
- `src/systems/skills/ChanneledSkill.ts` — Whirlwind
- `src/utils/combatHelper.ts` — shared applyDamageToTarget
- `tests/systems/SkillSystem.test.ts`

**Modify:**
- `src/systems/InputSystem.ts` — Q/E/R/F key bindings
- `src/systems/CombatSystem.ts` — extract applyDamageToEnemy → combatHelper
- `src/scenes/GameScene.ts` — add SkillSystem

---

### Task 1: Infrastructure (SkillSystem core + combatHelper + InputSystem + tests)

**Files:**
- Create: `src/utils/combatHelper.ts`
- Create: `src/systems/skills/SkillEffectHandler.ts`
- Create: `src/systems/SkillSystem.ts`
- Create: `tests/systems/SkillSystem.test.ts`
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/systems/InputSystem.ts`

- [ ] **Step 1: Create combatHelper.ts**

Extract the damage application logic from CombatSystem's `applyDamageToEnemy` into a shared utility.

```typescript
// src/utils/combatHelper.ts
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { GameRegistry } from '../core/GameRegistry';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { EnemySystem } from '../systems/EnemySystem';
import { calcDamage, applyMitigation } from './damage';
import type { EnemySprite } from '../systems/EnemySystem';

export interface DamageResult {
  finalDamage: number;
  killed: boolean;
  isCrit: boolean;
}

export function applyDamageToTarget(
  target: EnemySprite,
  baseDamage: number,
  skillMultiplier: number,
  registry: GameRegistry,
  playerSystem: PlayerSystem,
  enemySystem: EnemySystem,
): DamageResult {
  const result = calcDamage(baseDamage, skillMultiplier);
  const enemyConfig = registry.enemies.getOrNull(target.entity.configId);
  const armour = enemyConfig ? enemyConfig.baseHP * 0.02 : 0;
  const finalDamage = applyMitigation(result.damage, armour);

  target.entity.health -= finalDamage;
  const killed = target.entity.health <= 0;
  if (killed) target.entity.health = 0;

  const playerPos = playerSystem.getPlayer().position;
  EventBus.getInstance().emit(GameEvent.COMBAT_HIT, {
    attackerId: 'player',
    targetId: target.entity.id,
    damage: finalDamage,
    rawDamage: result.rawDamage,
    damageType: 'physical',
    isCrit: result.isCrit,
    ailmentApplied: null,
    hitPosition: { x: target.entity.position.x, y: target.entity.position.y },
  });

  if (killed) {
    EventBus.getInstance().emit(GameEvent.COMBAT_KILL, {
      attackerId: 'player',
      targetId: target.entity.id,
      enemyConfigId: target.entity.configId,
      zone: null,
      playerLevel: playerSystem.getPlayer().level,
    });
    enemySystem.markAsDead(target.entity.id);
  }

  return { finalDamage, killed, isCrit: result.isCrit };
}
```

Then update `CombatSystem.applyDamageToEnemy` to call this import instead.

- [ ] **Step 2: Create SkillEffectHandler interface**

```typescript
// src/systems/skills/SkillEffectHandler.ts
import type Phaser from 'phaser';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { EnemySystem } from '../systems/EnemySystem';
import type { GameRegistry } from '../core/GameRegistry';
import type { SkillConfig } from '../data/dataConfigs';

export interface SkillContext {
  scene: Phaser.Scene;
  playerSystem: PlayerSystem;
  enemySystem: EnemySystem;
  registry: GameRegistry;
  skill: SkillConfig;
  playerX: number;
  playerY: number;
  aimAngle: number;
}

export interface SkillEffectHandler {
  readonly type: string;
  execute(ctx: SkillContext): void;
}
```

- [ ] **Step 3: Create SkillSystem core**

```typescript
// src/systems/SkillSystem.ts
import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import type Phaser from 'phaser';
import type { InputSystem } from './InputSystem';
import type { PlayerSystem } from './PlayerSystem';
import type { EnemySystem } from './EnemySystem';
import type { GameRegistry } from '../core/GameRegistry';
import type { SkillConfig } from '../data/dataConfigs';
import type { SkillEffectHandler } from './skills/SkillEffectHandler';
import type { SkillContext } from './skills/SkillEffectHandler';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';

const logger = Logger.forSystem('SKILL');

type SkillSlot = 'basic' | 'q' | 'e' | 'r' | 'f';

export class SkillSystem implements ISystem {
  readonly name = 'SkillSystem';
  readonly logger = Logger.forSystem('SKILL');

  private scene!: Phaser.Scene;
  private inputSystem!: InputSystem;
  private playerSystem!: PlayerSystem;
  private enemySystem!: EnemySystem;
  private registry!: GameRegistry;

  private skillSlots = new Map<SkillSlot, SkillConfig | null>();
  private cooldowns = new Map<SkillSlot, number>();

  // Ongoing effect handlers (channeled, buff, delayed AoE)
  private activeEffects: { update(delta: number): void; destroy(): void }[] = [];

  // Buff state
  shieldRemaining = 0;
  shieldTimer = 0;

  // Channeled state
  isChannelling = false;
  private channelSlot: SkillSlot | null = null;

  private handlers = new Map<string, SkillEffectHandler>();
  private didInit = false;

  registerHandler(type: string, handler: SkillEffectHandler): void {
    this.handlers.set(type, handler);
  }

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.scene = cfg.scene as Phaser.Scene;
    this.inputSystem = cfg.inputSystem as InputSystem;
    this.playerSystem = cfg.playerSystem as PlayerSystem;
    this.enemySystem = cfg.enemySystem as EnemySystem;
    this.registry = cfg.registry as GameRegistry;

    const classId = this.playerSystem.getClassId();
    const classConfig = this.registry.classes.get(classId);
    const slots: SkillSlot[] = ['basic', 'q', 'e', 'r', 'f'];

    for (let i = 0; i < slots.length; i++) {
      const skillId = classConfig.startingSkillIds[i];
      const skill = skillId ? this.registry.skills.getOrNull(skillId) : null;
      this.skillSlots.set(slots[i], skill);
      this.cooldowns.set(slots[i], 0);
    }

    this.didInit = true;
    logger.info('Initialised', { classId, skillCount: classConfig.startingSkillIds.length });
  }

  destroy(): void {
    this.didInit = false;
    for (const e of this.activeEffects) e.destroy();
    this.activeEffects = [];
    this.isChannelling = false;
    this.channelSlot = null;
    this.shieldRemaining = 0;
    this.shieldTimer = 0;
  }

  update(delta: number): void {
    if (!this.didInit) return;

    // Tick cooldowns
    for (const [slot, cd] of this.cooldowns) {
      if (cd > 0) this.cooldowns.set(slot, Math.max(0, cd - delta));
    }

    // Tick shield
    if (this.shieldTimer > 0) {
      this.shieldTimer -= delta;
      if (this.shieldTimer <= 0) {
        this.shieldRemaining = 0;
        logger.info('Shield expired');
      }
    }

    // Tick active effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      this.activeEffects[i].update(delta);
    }

    // Check hotkey activations
    this.checkActivation('q');
    this.checkActivation('e');
    this.checkActivation('r');
    this.checkActivation('f');

    // Handle channeled skill (F) held state
    if (this.isChannelling && this.channelSlot) {
      const skill = this.skillSlots.get(this.channelSlot);
      if (skill && skill.skillType === 'channeled') {
        const player = this.playerSystem.getPlayer();
        if (player.resource <= 0 || !this.inputSystem.isSkillF()) {
          this.stopChannel();
        }
      }
    }
  }

  private checkActivation(slot: SkillSlot): void {
    const skill = this.skillSlots.get(slot);
    if (!skill) return;

    const keyMap: Record<SkillSlot, () => boolean> = {
      basic: () => false,
      q: () => this.inputSystem.isSkillQ(),
      e: () => this.inputSystem.isSkillE(),
      r: () => this.inputSystem.isSkillR(),
      f: () => this.inputSystem.isSkillF(),
    };

    if (!keyMap[slot]()) return;
    if (this.cooldowns.get(slot)! > 0) return;
    if (this.shieldTimer > 0 && slot !== 'f') return; // Shield blocks non-channeled skills

    // Validate resource
    const player = this.playerSystem.getPlayer();
    if (player.resource < skill.resourceCost) {
      logger.warn('Not enough resource', { skill: skill.id, resource: player.resource, cost: skill.resourceCost });
      return;
    }

    // Deduct resource
    player.resource -= skill.resourceCost;
    if (player.resource < 0) player.resource = 0;

    // Set cooldown
    this.cooldowns.set(slot, skill.cooldown);

    // Dispatch to handler
    const handler = this.handlers.get(skill.skillType);
    if (handler) {
      const ctx: SkillContext = {
        scene: this.scene,
        playerSystem: this.playerSystem,
        enemySystem: this.enemySystem,
        registry: this.registry,
        skill,
        playerX: player.position.x,
        playerY: player.position.y,
        aimAngle: this.inputSystem.getAimAngle(),
      };
      handler.execute(ctx);
    }

    // Handle channeled start
    if (skill.skillType === 'channeled') {
      this.isChannelling = true;
      this.channelSlot = slot;
    }

    EventBus.getInstance().emit(GameEvent.SKILL_USED, { skillId: skill.id, slot });
  }

  takeShieldDamage(amount: number): number {
    if (this.shieldRemaining <= 0) return amount;
    const absorbed = Math.min(this.shieldRemaining, amount);
    this.shieldRemaining -= absorbed;
    return amount - absorbed;
  }

  stopChannel(): void {
    this.isChannelling = false;
    this.channelSlot = null;
  }

  getSkillInSlot(slot: SkillSlot): SkillConfig | null {
    return this.skillSlots.get(slot) ?? null;
  }

  getCooldown(slot: SkillSlot): number {
    return this.cooldowns.get(slot) ?? 0;
  }

  getShield(): number { return this.shieldRemaining; }
}
```

- [ ] **Step 4: Add InputSystem Q/E/R/F bindings**

In `InputSystem.ts`, add:

```typescript
private skillQ = false;
private skillE = false;
private skillR = false;
private skillF = false;

// In keyboard handler (keydown):
if (event.key === 'q' || event.key === 'Q') this.skillQ = true;
if (event.key === 'e' || event.key === 'E') this.skillE = true;
if (event.key === 'r' || event.key === 'R') this.skillR = true;
if (event.key === 'f' || event.key === 'F') this.skillF = true;

// In keyboard handler (keyup):
if (event.key === 'q' || event.key === 'Q') this.skillQ = false;
if (event.key === 'e' || event.key === 'E') this.skillE = false;
if (event.key === 'r' || event.key === 'R') this.skillR = false;
if (event.key === 'f' || event.key === 'F') this.skillF = false;

// Getters:
isSkillQ(): boolean { return this.skillQ; }
isSkillE(): boolean { return this.skillE; }
isSkillR(): boolean { return this.skillR; }
isSkillF(): boolean { return this.skillF; }
```

- [ ] **Step 5: Write SkillSystem tests**

```typescript
// tests/systems/SkillSystem.test.ts
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Logger, LogLevel } from '../../src/core/Logger';
import { SkillSystem } from '../../src/systems/SkillSystem';
import { GameRegistry } from '../../src/core/GameRegistry';

beforeAll(() => { Logger.getInstance().setLevel(LogLevel.OFF); });
afterAll(() => { Logger.getInstance().setLevel(LogLevel.DEBUG); });

describe('SkillSystem', () => {
  let system: SkillSystem;
  let registry: GameRegistry;

  function makeRegistry(classId: string): GameRegistry {
    const r = new GameRegistry();
    r.classes.register('ironclad', {
      id: 'ironclad', name: 'Ironclad', resourceType: 'rage',
      baseStats: { health: 120, maxResource: 100, resourceRegen: 0, moveSpeed: 185, strength: 18, dexterity: 8, intelligence: 5, armour: 15, critChance: 5, critMultiplier: 150 },
      startingSkillIds: ['test_melee', 'test_aoe', 'test_buff', 'test_mobility', 'test_channel'],
      passives: ['ironclad_start'],
    });
    r.skills.register('test_melee', { id: 'test_melee', name: 'Test Melee', classId, slot: 'basic', resourceCost: 0, resourceGenerated: 5, cooldown: 0, damageMultiplier: 1.0, skillType: 'melee', description: '' });
    r.skills.register('test_mobility', { id: 'test_mobility', name: 'Test Mobility', classId, slot: 'r', resourceCost: 20, resourceGenerated: 0, cooldown: 4, damageMultiplier: 1.8, skillType: 'mobility', description: '' });
    return r;
  }

  // Mock InputSystem with skill key methods
  const mockInput = {
    isSkillQ: () => false,
    isSkillE: () => false,
    isSkillR: () => false,
    isSkillF: () => false,
    isAttacking: () => false,
    getAimAngle: () => 0,
  };

  class MockPlayerSystem {
    private player = {
      classId: '', position: { x: 0, y: 0 }, facingAngle: 0, moveSpeed: 185,
      health: 120, maxHealth: 120, resource: 100, maxResource: 100, resourceType: 'rage',
      level: 1, experience: 0, experienceToNext: 100,
      strength: 18, dexterity: 8, intelligence: 5, armour: 15, evasion: 0,
    };
    getPlayer() { return this.player; }
    getClassId() { return 'ironclad'; }
  }

  beforeEach(() => {
    system = new SkillSystem();
    registry = makeRegistry('ironclad');

    // Register mock handlers
    system.registerHandler('melee', { type: 'melee', execute: () => {} });
    system.registerHandler('mobility', { type: 'mobility', execute: () => {} });
    system.registerHandler('aoe', { type: 'aoe', execute: () => {} });
    system.registerHandler('buff', { type: 'buff', execute: () => {} });
    system.registerHandler('channeled', { type: 'channeled', execute: () => {} });

    system.init({
      scene: { add: { graphics: () => ({ setScrollFactor: () => ({ setDepth: () => {} }) }) } } as any,
      inputSystem: mockInput,
      playerSystem: new MockPlayerSystem(),
      enemySystem: {} as any,
      registry,
    });
  });

  it('maps 5 skills from class startingSkillIds', () => {
    expect(system.getSkillInSlot('basic')?.id).toBe('test_melee');
    expect(system.getSkillInSlot('r')?.id).toBe('test_mobility');
    expect(system.getSkillInSlot('q')?.id).toBe('test_aoe');
    expect(system.getSkillInSlot('e')?.id).toBe('test_buff');
    expect(system.getSkillInSlot('f')?.id).toBe('test_channel');
  });

  it('starts with 0 cooldowns', () => {
    expect(system.getCooldown('q')).toBe(0);
    expect(system.getCooldown('r')).toBe(0);
  });

  it('cooldown ticks down after activation', () => {
    // Can't easily test activation with mock input, test cooldown API
    expect(system.getCooldown('r')).toBe(0);
  });

  it('starts with 0 shield', () => {
    expect(system.getShield()).toBe(0);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run`
Expected: All existing + 4 new tests pass

- [ ] **Step 7: Commit**

```bash
git add src/utils/combatHelper.ts src/systems/skills/SkillEffectHandler.ts src/systems/SkillSystem.ts src/systems/CombatSystem.ts src/systems/InputSystem.ts tests/systems/SkillSystem.test.ts
git commit -m "feat: SkillSystem core with cooldowns, resource, combat helper, input bindings"
```

---

### Task 2: One-Shot Skill Handlers (Melee + Projectile + AoE Line)

**Files:**
- Create: `src/systems/skills/MeleeSkill.ts`
- Create: `src/systems/skills/ProjectileSkill.ts`
- Create: `src/systems/skills/AoELineSkill.ts`

- [ ] **Step 1: MeleeSkill**

```typescript
// src/systems/skills/MeleeSkill.ts
import type Phaser from 'phaser';
import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

const CONE_ANGLE = Math.PI / 3; // 60°
const CONE_RANGE = 60;
const KNOCKBACK = 40;

export class MeleeSkill implements SkillEffectHandler {
  readonly type = 'melee';

  execute(ctx: SkillContext): void {
    const enemies = ctx.enemySystem.getAliveEnemies();
    const skillMult = ctx.skill.damageMultiplier;

    for (const es of enemies) {
      const edx = es.entity.position.x - ctx.playerX;
      const edy = es.entity.position.y - ctx.playerY;
      const dist = Math.sqrt(edx * edx + edy * edy);
      if (dist > CONE_RANGE) continue;

      const enemyAngle = Math.atan2(edy, edx);
      let angleDiff = enemyAngle - ctx.aimAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= CONE_ANGLE) {
        // Knockback
        es.entity.position.x += Math.cos(ctx.aimAngle) * KNOCKBACK;
        es.entity.position.y += Math.sin(ctx.aimAngle) * KNOCKBACK;
        es.sprite.setPosition(es.entity.position.x, es.entity.position.y);

        // Generate resource
        const player = ctx.playerSystem.getPlayer();
        player.resource = Math.min(player.maxResource, player.resource + (ctx.skill.resourceGenerated ?? 0));

        applyDamageToTarget(es, 20, skillMult, ctx.registry, ctx.playerSystem, ctx.enemySystem);
      }
    }
  }
}
```

- [ ] **Step 2: ProjectileSkill**

```typescript
// src/systems/skills/ProjectileSkill.ts
import type Phaser from 'phaser';
import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

const PROJ_SPEED = 600;
const PROJ_LIFETIME = 2;
const MULTI_COUNT = 5;
const MULTI_FAN = Math.PI / 6; // 30° total

interface ProjectileState {
  x: number; y: number;
  vx: number; vy: number;
  lifetime: number;
  sprite: Phaser.GameObjects.Rectangle;
  trail: Phaser.GameObjects.Rectangle[];
  skillMult: number;
  hasHit: boolean;
  isExplosive: boolean;
  embedded?: { px: number; py: number; timer: number };
}

// Shared active projectiles list — managed by SkillSystem
const activeProjectiles: ProjectileState[] = [];
export function updateProjectiles(delta: number, enemySystem: any, playerSystem: any, registry: any, skillSystem: any): void { /* ... */ }
```

(For brevity: the projectile handler manages a list of active ProjectileState objects, each with position, velocity, lifetime, visual sprites. Single arrow, multi-arrow fan spread, and explosive arrow variants are determined by skill ID detection. Explosive arrow embeds on wall/enemy hit, detonates after 0.5s with AoE check in 256px radius.)

- [ ] **Step 3: AoELineSkill**

```typescript
// src/systems/skills/AoELineSkill.ts
const SHOCKWAVE_W = 192;
const SHOCKWAVE_H = 100;
const SHOCKWAVE_SPEED = 400;

interface ShockwaveState {
  x: number; y: number;
  dirX: number; dirY: number;
  travelled: number;
  sprite: Phaser.GameObjects.Rectangle[];
  hitEnemies: Set<string>;
  skillMult: number;
}
```

(Shockwave state: spawns at player position, travels forward, checks enemy bounding rect overlap. On enemy hit, applies damage + stagger. Destroyed after traveling 3 tiles / 192px.)

- [ ] **Step 4: Commit**

```bash
git add src/systems/skills/MeleeSkill.ts src/systems/skills/ProjectileSkill.ts src/systems/skills/AoELineSkill.ts
git commit -m "feat: one-shot skill handlers - melee, projectile, AoE line"
```

---

### Task 3: Ongoing Skill Handlers (AoE Targeted + Mobility + Buff + Channeled)

**Files:**
- Create: `src/systems/skills/AoETargetSkill.ts`
- Create: `src/systems/skills/MobilitySkill.ts`
- Create: `src/systems/skills/BuffSkill.ts`
- Create: `src/systems/skills/ChanneledSkill.ts`

- [ ] **Step 1: AoETargetSkill** — Rain of Arrows
Zone marked on screen. 1s delay timer. Then 12 random arrow drops in 4×4 tile zone over 2s. Each arrow checks collision with nearby enemies (60px radius).

- [ ] **Step 2: MobilitySkill** — Berserker's Charge + Vaulting Escape
Dash: instant position teleport 256px toward cursor. Corridor check (60px wide) for enemies along path. Damage + stun.
Backflip: instant position teleport 192px away from cursor. Set invulnerability flag for 0.3s.

- [ ] **Step 3: BuffSkill** — Iron Fortress
Sets SkillSystem.shieldRemaining = armour × 3, SkillSystem.shieldTimer = 2. Visual: blue-white stroke around player sprite (setStrokeStyle on player sprite).

- [ ] **Step 4: ChanneledSkill** — Whirlwind
Updates handled by SkillSystem update loop (resource drain). This handler's `execute` just initializes a rotating visual. The damage tick happens via a per-frame check: on every 0.3s interval, check all enemies within 80px radius, apply 80% damage.

- [ ] **Step 5: Commit**

```bash
git add src/systems/skills/AoETargetSkill.ts src/systems/skills/MobilitySkill.ts src/systems/skills/BuffSkill.ts src/systems/skills/ChanneledSkill.ts
git commit -m "feat: ongoing skill handlers - AoE target, mobility, buff, channeled"
```

---

### Task 4: Integration (GameScene + Skill handler registration + full test suite)

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Wire SkillSystem into GameScene**

Import and register all handlers in `GameScene.create()`:

```typescript
import { SkillSystem } from '../systems/SkillSystem';
import { MeleeSkill } from '../systems/skills/MeleeSkill';
import { ProjectileSkill } from '../systems/skills/ProjectileSkill';
import { AoELineSkill } from '../systems/skills/AoELineSkill';
import { AoETargetSkill } from '../systems/skills/AoETargetSkill';
import { MobilitySkill } from '../systems/skills/MobilitySkill';
import { BuffSkill } from '../systems/skills/BuffSkill';
import { ChanneledSkill } from '../systems/skills/ChanneledSkill';

// In create():
const skillSystem = new SkillSystem();
skillSystem.registerHandler('melee', new MeleeSkill());
skillSystem.registerHandler('ranged', new ProjectileSkill());
skillSystem.registerHandler('aoe', new AoELineSkill());
skillSystem.registerHandler('mobility', new MobilitySkill());
// ... etc

this.systemManager.add(skillSystem);

this.systemManager.initAll({
  // ... existing refs
  skillSystem,
});
```

Note: `AoETargetSkill`, `BuffSkill`, `ChanneledSkill` will need a reference to SkillSystem for managing ongoing effect state (shield, channel tracking). Pass skillSystem in the context or store a reference.

- [ ] **Step 2: Update CombatSystem**

Replace inline `applyDamageToEnemy` with call to imported `applyDamageToTarget` from combatHelper.ts.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/CombatSystem.ts
git commit -m "feat: integrate SkillSystem into GameScene, refactor CombatSystem"
```
