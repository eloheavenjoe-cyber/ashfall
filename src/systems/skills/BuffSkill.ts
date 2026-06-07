import type { SkillEffectHandler, SkillContext } from './SkillEffectHandler';

export const BuffSkill: SkillEffectHandler = {
  type: 'buff',
  execute(ctx: SkillContext): void {
    const { playerSystem, skillSystem } = ctx;
    const player = playerSystem.getPlayer();
    skillSystem.setShield(player.armour * 3, 2);
    playerSystem.getSprite().setStrokeStyle(2, 0x4488ff, 0.8);
  },
};
