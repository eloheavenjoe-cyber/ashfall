import type Phaser from 'phaser';
import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { InputSystem } from './InputSystem';
import type { PlayerSystem } from './PlayerSystem';
import type { EnemySystem } from './EnemySystem';
import type { GameRegistry } from '../core/GameRegistry';
import type { SkillConfig } from '../data/dataConfigs';
import { calcDamage, applyMitigation } from '../utils/damage';

const logger = Logger.forSystem('COMBAT');

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  sprite: Phaser.GameObjects.Rectangle;
}

const MELEE_RANGE = 50;
const MELEE_ANGLE = Math.PI / 4;
const PROJECTILE_SPEED = 500;
const PROJECTILE_MAX_LIFETIME = 2;
const ATK_COOLDOWN = 0.6;

export class CombatSystem implements ISystem {
  readonly name = 'CombatSystem';
  readonly logger = Logger.forSystem('COMBAT');

  private scene!: Phaser.Scene;
  private inputSystem!: InputSystem;
  private playerSystem!: PlayerSystem;
  private enemySystem!: EnemySystem;
  private registry!: GameRegistry;
  private didInit = false;

  private attackTimer = 0;
  private projectiles: Projectile[] = [];

  private baseSkill: SkillConfig | null = null;
  private isRangedClass = false;
  private baseDamage = 15;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.scene = cfg.scene as Phaser.Scene;
    this.inputSystem = cfg.inputSystem as InputSystem;
    this.playerSystem = cfg.playerSystem as PlayerSystem;
    this.enemySystem = cfg.enemySystem as EnemySystem;
    this.registry = cfg.registry as GameRegistry;
    this.didInit = true;

    const classId = this.playerSystem.getClassId();
    this.isRangedClass = classId === 'ranger';
    const classConfig = this.registry.classes.get(classId);
    if (classConfig.startingSkillIds.length > 0) {
      this.baseSkill = this.registry.skills.getOrNull(classConfig.startingSkillIds[0]);
    }
    this.baseDamage = classId === 'ironclad' ? 20 : 15;
    logger.info('Initialised', { classId, isRanged: this.isRangedClass, baseDamage: this.baseDamage });
  }

  update(delta: number): void {
    if (!this.didInit) return;

    this.attackTimer = Math.max(0, this.attackTimer - delta);

    if (this.inputSystem.isAttacking() && this.attackTimer <= 0) {
      this.executePlayerAttack();
    }

    this.updateProjectiles(delta);
  }

  destroy(): void {
    for (const p of this.projectiles) {
      p.sprite.destroy();
    }
    this.projectiles = [];
    logger.info('Destroyed');
  }

  private executePlayerAttack(): void {
    this.attackTimer = ATK_COOLDOWN;
    const player = this.playerSystem.getPlayer();
    const angle = this.inputSystem.getAimAngle();

    if (this.isRangedClass) {
      this.fireProjectile(player.position.x, player.position.y, angle);
    } else {
      this.executeMeleeSwing(player.position.x, player.position.y, angle);
    }
  }

  private executeMeleeSwing(px: number, py: number, angle: number): void {
    const enemies = this.enemySystem.getAliveEnemies();
    const skillMult = this.baseSkill?.damageMultiplier ?? 1.0;

    let closestEnemy: (typeof enemies)[number] | null = null;
    let closestDist = Infinity;

    for (const es of enemies) {
      const edx = es.entity.position.x - px;
      const edy = es.entity.position.y - py;
      const dist = Math.sqrt(edx * edx + edy * edy);

      if (dist > MELEE_RANGE) continue;

      const enemyAngle = Math.atan2(edy, edx);
      let angleDiff = enemyAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= MELEE_ANGLE && dist < closestDist) {
        closestDist = dist;
        closestEnemy = es;
      }
    }

    if (closestEnemy) {
      this.applyDamageToEnemy(closestEnemy, skillMult);
    }
  }

  private fireProjectile(px: number, py: number, angle: number): void {
    const sprite = this.scene.add.rectangle(px, py, 6, 6, 0xcccccc, 1);
    sprite.setDepth(99998);

    this.projectiles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * PROJECTILE_SPEED,
      vy: Math.sin(angle) * PROJECTILE_SPEED,
      lifetime: 0,
      sprite,
    });
  }

  private updateProjectiles(delta: number): void {
    const enemies = this.enemySystem.getAliveEnemies();
    const skillMult = this.baseSkill?.damageMultiplier ?? 1.0;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime += delta;

      if (p.lifetime >= PROJECTILE_MAX_LIFETIME) {
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.sprite.setPosition(p.x, p.y);

      for (const es of enemies) {
        const edx = es.entity.position.x - p.x;
        const edy = es.entity.position.y - p.y;
        const dist = Math.sqrt(edx * edx + edy * edy);
        if (dist < 20) {
          this.applyDamageToEnemy(es, skillMult);
          p.sprite.destroy();
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  private applyDamageToEnemy(es: { entity: { id: string; health: number; maxHealth: number; position: { x: number; y: number }; configId: string; damage: number; moveSpeed: number; attackRange: number; detectionRadius: number; state: string; stateTimer: number; attackCooldown: number; wanderAngle: number; wanderTimer: number; xpReward: number }; sprite: Phaser.GameObjects.Rectangle }, skillMult: number): void {
    const result = calcDamage(this.baseDamage, skillMult);
    const enemyConfig = this.registry.enemies.getOrNull(es.entity.configId);
    const armour = enemyConfig ? enemyConfig.baseHP * 0.02 : 0;
    const finalDamage = applyMitigation(result.damage, armour);

    es.entity.health -= finalDamage;
    const killed = es.entity.health <= 0;
    if (killed) es.entity.health = 0;

    EventBus.getInstance().emit(GameEvent.COMBAT_HIT, {
      attackerId: 'player',
      targetId: es.entity.id,
      damage: finalDamage,
      rawDamage: result.rawDamage,
      damageType: 'physical',
      isCrit: result.isCrit,
      ailmentApplied: null,
      hitPosition: { x: es.entity.position.x, y: es.entity.position.y },
    });

    if (killed) {
      EventBus.getInstance().emit(GameEvent.COMBAT_KILL, {
        attackerId: 'player',
        targetId: es.entity.id,
        enemyConfigId: es.entity.configId,
        zone: null,
        playerLevel: this.playerSystem.getPlayer().level,
      });
      this.enemySystem.markAsDead(es.entity.id);
    }
  }
}
