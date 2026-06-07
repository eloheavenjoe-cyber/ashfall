import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

function pointToSegmentDistSq(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = ax + t * dx;
  const nearY = ay + t * dy;
  return (px - nearX) * (px - nearX) + (py - nearY) * (py - nearY);
}

export const MobilitySkill: SkillEffectHandler = {
  type: 'mobility',
  execute(ctx: SkillContext): void {
    const { scene, playerSystem, enemySystem, registry, skill, playerX, playerY, aimAngle } = ctx;

    if (skill.id === 'berserker_charge') {
      const dashDist = 256;
      const newX = playerX + Math.cos(aimAngle) * dashDist;
      const newY = playerY + Math.sin(aimAngle) * dashDist;

      const player = playerSystem.getPlayer();
      player.position.x = newX;
      player.position.y = newY;
      playerSystem.getSprite().setPosition(newX, newY);

      const corridorHalf = 30;
      const enemies = enemySystem.getAliveEnemies();
      for (const es of enemies) {
        const distSq = pointToSegmentDistSq(
          es.entity.position.x, es.entity.position.y,
          playerX, playerY, newX, newY,
        );
        if (distSq < corridorHalf * corridorHalf) {
          es.entity.stateTimer = 0.5;
          applyDamageToTarget(es, 0, skill.damageMultiplier, registry, playerSystem, enemySystem);
        }
      }

      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const ax = playerX + (newX - playerX) * t;
        const ay = playerY + (newY - playerY) * t;
        const afterimage = scene.add.rectangle(ax, ay, 28, 44, 0x4488ff, 0.3);
        afterimage.setDepth(9999);
        scene.time.delayedCall(200, () => afterimage.destroy());
      }
    } else if (skill.id === 'vaulting_escape') {
      const vaultDist = 192;
      const newX = playerX - Math.cos(aimAngle) * vaultDist;
      const newY = playerY - Math.sin(aimAngle) * vaultDist;

      const player = playerSystem.getPlayer();
      player.position.x = newX;
      player.position.y = newY;
      playerSystem.getSprite().setPosition(newX, newY);
    }
  },
};
