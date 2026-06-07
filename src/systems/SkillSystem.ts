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

export type SkillSlot = 'basic' | 'q' | 'e' | 'r' | 'f';

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

  private activeEffects: { update(delta: number): void; destroy(): void }[] = [];

  private shieldRemaining = 0;
  private shieldTimer = 0;
  private isChannelling = false;
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

    for (const [slot, cd] of this.cooldowns) {
      if (cd > 0) this.cooldowns.set(slot, Math.max(0, cd - delta));
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer -= delta;
      if (this.shieldTimer <= 0) {
        this.shieldRemaining = 0;
      }
    }

    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      this.activeEffects[i].update(delta);
    }

    this.checkActivation('q');
    this.checkActivation('e');
    this.checkActivation('r');
    this.checkActivation('f');

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
    if (this.isChannelling) return;

    const isPressed = (() => {
      switch (slot) {
        case 'q': return this.inputSystem.isSkillQ();
        case 'e': return this.inputSystem.isSkillE();
        case 'r': return this.inputSystem.isSkillR();
        case 'f': return this.inputSystem.isSkillF();
        default: return false;
      }
    })();
    if (!isPressed) return;
    if (this.cooldowns.get(slot)! > 0) return;
    if (this.shieldTimer > 0 && slot !== 'f') return;

    const player = this.playerSystem.getPlayer();
    if (player.resource < skill.resourceCost) return;

    player.resource -= skill.resourceCost;
    if (player.resource < 0) player.resource = 0;
    this.cooldowns.set(slot, skill.cooldown);

    const handler = this.handlers.get(skill.skillType);
    if (handler) {
      const self = this;
      const ctx: SkillContext = {
        scene: this.scene,
        playerSystem: this.playerSystem,
        enemySystem: this.enemySystem,
        registry: this.registry,
        skillSystem: this,
        skill,
        playerX: player.position.x,
        playerY: player.position.y,
        aimAngle: this.inputSystem.getAimAngle(),
        addEffect(effect) { self.activeEffects.push(effect); },
      };
      handler.execute(ctx);
    }

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
  getShieldTimer(): number { return this.shieldTimer; }
  getIsChannelling(): boolean { return this.isChannelling; }
}
