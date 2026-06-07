import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

export const AoELineSkill: SkillEffectHandler = {
  type: 'aoe',
  execute(ctx: SkillContext): void {
    const { scene, playerSystem, enemySystem, registry, skill, playerX, playerY, aimAngle, addEffect } = ctx;

    const totalDist = 192;
    const speed = 400;
    const width = 100;
    const visual = scene.add.rectangle(playerX, playerY, totalDist, width, 0x666644, 0.5);
    visual.setRotation(aimAngle);
    visual.setDepth(9999);

    const hitEnemies = new Set<string>();
    let travelled = 0;
    let done = false;

    addEffect({
      update(delta: number): void {
        if (done) return;

        const step = speed * delta;
        travelled += step;

        if (travelled >= totalDist) {
          visual.destroy();
          done = true;
          return;
        }

        visual.x += Math.cos(aimAngle) * step;
        visual.y += Math.sin(aimAngle) * step;

        const halfLen = totalDist / 2;
        const halfW = width / 2;
        const cos = Math.cos(-aimAngle);
        const sin = Math.sin(-aimAngle);

        const enemies = enemySystem.getAliveEnemies();
        for (const es of enemies) {
          if (hitEnemies.has(es.entity.id)) continue;

          const dx = es.entity.position.x - visual.x;
          const dy = es.entity.position.y - visual.y;
          const localX = dx * cos - dy * sin;
          const localY = dx * sin + dy * cos;

          if (Math.abs(localX) < halfLen && Math.abs(localY) < halfW) {
            hitEnemies.add(es.entity.id);
            es.entity.stateTimer = 0;
            applyDamageToTarget(es, 0, skill.damageMultiplier, registry, playerSystem, enemySystem);
          }
        }
      },
      destroy(): void {
        if (!done) visual.destroy();
      },
    });
  },
};
