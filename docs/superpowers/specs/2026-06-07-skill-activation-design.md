# ASHFALL — Phase 1.5.1: Skill Activation

**Date:** 2026-06-07
**Status:** Design approved

## Overview

Implement 10 class skills (5 Ironclad, 5 Ranger) with hotkey activation (Q/E/R/F + LMB), cooldown timers, resource costs/generation, and 6 distinct skill types: melee, projectile, AoE line, AoE targeted, mobility, buff, and channeled.

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/systems/SkillSystem.ts` | Hotkey mapping, cooldowns, resource validation, channeling/shield state, per-frame update, dispatches to handlers |
| `src/systems/skills/SkillEffectHandler.ts` | Base interface: `execute(skill, context): void` |
| `src/systems/skills/MeleeSkill.ts` | Cone melee (Crushing Blow) — 60° forward, 60px, knockback |
| `src/systems/skills/ProjectileSkill.ts` | Single/multi/fan projectiles (Quickshot, Multishot, Explosive Arrow) |
| `src/systems/skills/AoELineSkill.ts` | Moving shockwave (Seismic Slam) — 192×100px, stagger |
| `src/systems/skills/AoETargetSkill.ts` | Targeted zone + delayed rain (Rain of Arrows) — 12 falling arrows |
| `src/systems/skills/MobilitySkill.ts` | Dash/backflip (Berserker's Charge, Vaulting Escape) — corridor damage + invulnerability |
| `src/systems/skills/BuffSkill.ts` | Damage shield (Iron Fortress) — absorbs armour×3, blocks attacks, allows movement |
| `src/systems/skills/ChanneledSkill.ts` | Continuous spin AoE (Whirlwind) — 80px radius, 0.3s ticks, 15 rage/sec drain |
| `src/utils/combatHelper.ts` | Shared `applyDamageToTarget()` extracted from CombatSystem |
| `tests/systems/SkillSystem.test.ts` | Cooldowns, resource, activation gating, shield/cleanse |

### Modified Files

| File | Change |
|---|---|
| `src/systems/InputSystem.ts` | Add `isSkillQ/E/R/F()` getters + Q/E/R/F key bindings |
| `src/scenes/GameScene.ts` | Add SkillSystem, pass all refs |
| `src/systems/CombatSystem.ts` | Replace inline `applyDamageToEnemy` with `combatHelper` import |

### Data Flow

```
Q/E/R/F pressed → InputSystem → SkillSystem.update()
  → Check cooldown > 0? → ignore
  → Check resource >= cost? → ignore
  → Deduct resource, set cooldown
  → Dispatch to SkillEffectHandler (by skillType)
  → Handler creates visual objects, checks hit detection per frame
  → On hit: applyDamageToTarget() → damage + kill events
  → On complete: cooldown ticks down
```

### Skill Mapping

| Slot | Key | Ironclad | Type | Ranger | Type | CD |
|---|---|---|---|---|---|---|
| basic | LMB | Crushing Blow 110% | Melee | Quickshot 100% | Projectile | 0s |
| q | Q | Seismic Slam 150% | AoE Line | Multishot 80%×5 | 5x Proj | 3s |
| e | E | Iron Fortress | Buff Shield | Explosive Arrow 200% | Delayed AoE | 6s/5s |
| r | R | Berserker's Charge 180% | Mobility | Vaulting Escape | Mobility | 5s/4s |
| f | F | Whirlwind 80%/tick | Channeled | Rain of Arrows 120%×12 | Targeted AoE | 1s/8s |

## Skill Mechanics Detail

### Resource System

- **Ironclad (Rage):** Starts at 0. Basic attacks generate +5. Skills cost rage. Whirlwind drains 15/sec. Caps at maxResource (100).
- **Ranger (Stamina):** Starts at 100 (full). Basic attacks generate +3. Skills cost stamina. Caps at maxResource (100).

### Per-Type Hit Detection

| Type | Detection | Visual |
|---|---|---|
| Melee | Cone 60°, 60px range, knockback 40px | Player flash, enemy stagger |
| Projectile (single) | 12px radius vs enemy, 600px/s, 2s lifetime | Colored arrow rect (8×3), trail |
| Projectile (multi) | 5 arrows, 30° fan, 500px/s | 5 arrows spread evenly |
| Projectile (delayed) | Single arrow → embed → 0.5s → 256px radius AoE detonation | Glowing arrow → flash burst |
| AoE Line | Moving rect 192×100px, 400px/s, continuous hit check | Expanding ground-crack rects |
| AoE Targeted | 4×4 tile iso zone (256×128px), 1s delay, 12 random arrows over 2s | Target circle pulse → falling arrows |
| Mobility Dash | Corridor 60px wide from start→end (256px), instant | Player flash + afterimages |
| Mobility Backflip | Instant teleport 192px, 0.3s invulnerability | Player flash + afterimages |
| Buff Shield | armour×3 shield, 2s duration, blocks attacks, allows movement | Blue-white stroke glow |
| Channeled Spin | 80px radius circle, hits every 0.3s, 15 rage/sec drain | Rotating quarter-arc |

### Edge Cases

1. **Multishot at close range:** All 5 arrows can hit one enemy — desired behavior
2. **Whirlwind + basic attacks:** Both can interleave — Whirlwind drain is independent
3. **Buff during channel:** Iron Fortress + Whirlwind coexist — shield absorbs, spin deals
4. **Mobility into walls:** No walls on infinite grid — no bounds checking
5. **Missed projectile:** Fades at max lifetime (2s)
6. **Iron Fortress blocks attacks:** LMB is suppressed while shield is active

### SkillContext

Each skill handler receives a context object with all the references it needs:

```typescript
interface SkillContext {
  scene: Phaser.Scene;
  playerSystem: PlayerSystem;
  enemySystem: EnemySystem;
  registry: GameRegistry;
  skill: SkillConfig;
  playerPosition: { x: number; y: number };
  aimAngle: number;
}
```

The `SkillEffectHandler` interface:

```typescript
interface SkillEffectHandler {
  readonly type: string;
  execute(context: SkillContext): void;
  update?(delta: number): void; // for ongoing effects (channeled, delayed, AoE tick)
  destroy?(): void;
}
```

## Testing (SkillSystem)

| Test | What It Verifies |
|---|---|
| 5 skills mapped per class from startingSkillIds | Correct slot population |
| Cooldown prevents reactivation | Use → retry → blocked |
| Resource cost blocks when insufficient | Set 0 resource → activation fails |
| Resource deducted on use | Full → activation → reduced by cost |
| Cooldown ticks down over time | Use → wait → decreased |
| Whirlwind drains 15/sec | Channel 1s → resource -15 |
| Whirlwind stops at 0 resource | Channel at 14 → stops |
| Iron Fortress blocks LMB attack | Shield active → LMB ignored |
| Shield absorbs damage | 100 shield → 80 hit → 20 remaining |
| Shield expires after 2s | Wait 2.1s → shield cleared |
