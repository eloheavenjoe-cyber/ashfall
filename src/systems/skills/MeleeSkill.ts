import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

export const MeleeSkill: SkillEffectHandler = {
  type: 'melee',
  execute(ctx: SkillContext): void {
    const { playerSystem, enemySystem, registry, skill, playerX, playerY, aimAngle } = ctx;
    const enemies = enemySystem.getAliveEnemies();
    const range = 60;
    const halfArc = Math.PI / 6;
    const knockbackDist = 40;

    for (const es of enemies) {
      const dx = es.entity.position.x - playerX;
      const dy = es.entity.position.y - playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.001 || dist > range) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      let diff = angleToEnemy - aimAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) > halfArc) continue;

      es.entity.position.x += Math.cos(aimAngle) * knockbackDist;
      es.entity.position.y += Math.sin(aimAngle) * knockbackDist;

      const player = playerSystem.getPlayer();
      player.resource = Math.min(player.maxResource, player.resource + skill.resourceGenerated);

      applyDamageToTarget(es, 20, skill.damageMultiplier, registry, playerSystem, enemySystem);
    }
  },
};
