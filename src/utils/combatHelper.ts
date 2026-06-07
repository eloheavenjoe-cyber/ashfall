import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { GameRegistry } from '../core/GameRegistry';
import type { PlayerSystem } from '../systems/PlayerSystem';
import type { EnemySystem } from '../systems/EnemySystem';
import { calcDamage, applyMitigation } from './damage';

export interface DamageResult {
  finalDamage: number;
  killed: boolean;
  isCrit: boolean;
}

export function applyDamageToTarget(
  target: { entity: { id: string; health: number; maxHealth: number; position: { x: number; y: number }; configId: string }; sprite: Phaser.GameObjects.Rectangle },
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
