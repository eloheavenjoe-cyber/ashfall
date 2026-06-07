import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';
import { applyDamageToTarget } from '../../utils/combatHelper';

export const AoETargetSkill: SkillEffectHandler = {
  type: 'aoe_target',
  execute(ctx: SkillContext): void {
    const { scene, playerSystem, enemySystem, registry, skill, addEffect } = ctx;
    const pointer = scene.input.activePointer;
    const cx = pointer.worldX;
    const cy = pointer.worldY;

    const zoneWidth = 256;
    const zoneHeight = 128;

    const targetZone = scene.add.rectangle(cx, cy, zoneWidth, zoneHeight);
    targetZone.setStrokeStyle(2, 0xffcc00, 0.2);
    targetZone.setDepth(9999);

    let state: 'delay' | 'spawning' | 'done' = 'delay';
    let delayTimer = 0;
    let spawnTimer = 0;
    let spawnCount = 0;
    const totalArrows = 12;
    const arrowInterval = 2 / totalArrows;

    const arrows: {
      rect: Phaser.GameObjects.Rectangle;
      x: number;
      y: number;
      hitEnemies: Set<string>;
    }[] = [];

    addEffect({
      update(delta: number): void {
        if (state === 'done') return;

        if (state === 'delay') {
          delayTimer += delta;
          const pulseAlpha = 0.1 + Math.sin(delayTimer * 6) * 0.1;
          targetZone.setAlpha(pulseAlpha);
          if (delayTimer >= 1) {
            state = 'spawning';
            targetZone.setAlpha(0.2);
          }
          return;
        }

        if (state === 'spawning') {
          spawnTimer += delta;
          while (spawnTimer >= arrowInterval && spawnCount < totalArrows) {
            const ax = (cx - zoneWidth / 2) + Math.random() * zoneWidth;
            const ay = cy - 200;
            const rect = scene.add.rectangle(ax, ay, 6, 12, 0x886644, 1);
            rect.setDepth(9999);
            arrows.push({ rect, x: ax, y: ay, hitEnemies: new Set() });
            spawnCount++;
            spawnTimer -= arrowInterval;
          }
          if (spawnCount >= totalArrows) {
            state = 'done';
          }
        }

        for (let i = arrows.length - 1; i >= 0; i--) {
          const arrow = arrows[i];
          arrow.y += 300 * delta;
          arrow.rect.setPosition(arrow.x, arrow.y);

          const enemies = enemySystem.getAliveEnemies();
          for (const es of enemies) {
            if (arrow.hitEnemies.has(es.entity.id)) continue;
            const dx = es.entity.position.x - arrow.x;
            const dy = es.entity.position.y - arrow.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 60) {
              arrow.hitEnemies.add(es.entity.id);
              applyDamageToTarget(es, 0, skill.damageMultiplier, registry, playerSystem, enemySystem);
            }
          }

          if (arrow.y > cy + 100) {
            arrow.rect.destroy();
            arrows.splice(i, 1);
          }
        }
      },
      destroy(): void {
        targetZone.destroy();
        for (const arrow of arrows) {
          arrow.rect.destroy();
        }
      },
    });
  },
};
