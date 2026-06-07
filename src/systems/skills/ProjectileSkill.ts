import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

export const ProjectileSkill: SkillEffectHandler = {
  type: 'ranged',
  execute(ctx: SkillContext): void {
    const { scene, playerSystem, enemySystem, registry, skill, playerX, playerY, aimAngle, addEffect } = ctx;
    const skillId = skill.id;

    function spawnProjectile(angle: number, speed: number, isExplosive: boolean): void {
      const color = isExplosive ? 0xff8800 : 0xffffff;
      const projectile = scene.add.rectangle(playerX, playerY, 8, 3, color, 1);
      projectile.setRotation(angle);
      projectile.setDepth(9999);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      let elapsed = 0;
      let embedded = false;
      let detonationTimer = 0;
      let detonated = false;

      addEffect({
        update(delta: number): void {
          if (detonated) return;

          if (embedded) {
            detonationTimer += delta;
            if (detonationTimer >= 0.5) {
              const cx = projectile.x;
              const cy = projectile.y;
              const radius = 128;
              const enemies = enemySystem.getAliveEnemies();
              for (const es of enemies) {
                const edx = es.entity.position.x - cx;
                const edy = es.entity.position.y - cy;
                const dist = Math.sqrt(edx * edx + edy * edy);
                if (dist < radius) {
                  const falloff = 1 - dist / radius;
                  applyDamageToTarget(es, Math.round(15 * falloff), skill.damageMultiplier, registry, playerSystem, enemySystem);
                }
              }
              const circle = scene.add.circle(cx, cy, radius, 0xff8800, 0.3);
              circle.setDepth(9998);
              scene.time.delayedCall(300, () => circle.destroy());
              projectile.destroy();
              detonated = true;
            }
            return;
          }

          elapsed += delta;
          if (elapsed >= 2) {
            projectile.destroy();
            detonated = true;
            return;
          }

          projectile.x += vx * delta;
          projectile.y += vy * delta;

          const enemies = enemySystem.getAliveEnemies();
          for (const es of enemies) {
            const edx = es.entity.position.x - projectile.x;
            const edy = es.entity.position.y - projectile.y;
            const dist = Math.sqrt(edx * edx + edy * edy);
            if (dist < 20) {
              if (isExplosive) {
                embedded = true;
                detonationTimer = 0;
              } else {
                applyDamageToTarget(es, 15, skill.damageMultiplier, registry, playerSystem, enemySystem);
                projectile.destroy();
                detonated = true;
              }
              break;
            }
          }
        },
        destroy(): void {
          if (!detonated) {
            projectile.destroy();
          }
        },
      });
    }

    if (skillId === 'quickshot') {
      spawnProjectile(aimAngle, 600, false);
    } else if (skillId === 'multishot') {
      const spread = Math.PI / 12;
      for (let i = -2; i <= 2; i++) {
        spawnProjectile(aimAngle + i * spread, 500, false);
      }
    } else if (skillId === 'explosive_arrow') {
      spawnProjectile(aimAngle, 420, true);
    }
  },
};
