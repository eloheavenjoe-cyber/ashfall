import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

export const ChanneledSkill: SkillEffectHandler = {
  type: 'channeled',
  execute(ctx: SkillContext): void {
    const { scene, playerSystem, enemySystem, registry, skill, addEffect } = ctx;

    const radius = 80;
    const graphics = scene.add.graphics();
    graphics.setDepth(9999);

    let rotation = 0;
    let tickTimer = 0;
    const tickInterval = 0.3;

    addEffect({
      update(delta: number): void {
        const p = playerSystem.getPlayer();
        const px = p.position.x;
        const py = p.position.y;

        rotation += 2 * Math.PI * delta;
        if (rotation > Math.PI * 2) rotation -= Math.PI * 2;

        graphics.clear();
        graphics.fillStyle(0xff8844, 0.4);
        graphics.slice(px, py, radius, rotation, rotation + Math.PI / 2, false);
        graphics.fillPath();

        tickTimer += delta;
        if (tickTimer >= tickInterval) {
          tickTimer -= tickInterval;
          const hitSet = new Set<string>();
          const enemies = enemySystem.getAliveEnemies();
          for (const es of enemies) {
            if (hitSet.has(es.entity.id)) continue;
            const dx = es.entity.position.x - px;
            const dy = es.entity.position.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius) {
              hitSet.add(es.entity.id);
              applyDamageToTarget(es, 0, skill.damageMultiplier, registry, playerSystem, enemySystem);
            }
          }
        }
      },
      destroy(): void {
        graphics.destroy();
      },
    });
  },
};
