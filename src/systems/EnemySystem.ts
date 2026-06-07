import type Phaser from 'phaser';
import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { GameRegistry } from '../core/GameRegistry';
import type { PlayerSystem } from './PlayerSystem';
import type { EnemyEntity, EnemyState } from '../entities/Enemy';
import { createEnemy } from '../entities/Enemy';

const logger = Logger.forSystem('ENEMY');

const ENEMY_COLORS: Record<string, number> = {
  hollow_husk: 0xcc3333,
  scabrous_rat: 0x886633,
  grave_archer: 0xcc8833,
};

const ENEMY_SIZES: Record<string, { w: number; h: number }> = {
  hollow_husk: { w: 28, h: 36 },
  scabrous_rat: { w: 20, h: 18 },
  grave_archer: { w: 24, h: 32 },
};

export interface EnemySprite {
  entity: EnemyEntity;
  sprite: Phaser.GameObjects.Rectangle;
}

export class EnemySystem implements ISystem {
  readonly name = 'EnemySystem';
  readonly logger = Logger.forSystem('ENEMY');

  private scene!: Phaser.Scene;
  private playerSystem!: PlayerSystem;
  private registry!: GameRegistry;
  private enemySprites: EnemySprite[] = [];
  private didInit = false;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.scene = cfg.scene as Phaser.Scene;
    this.playerSystem = cfg.playerSystem as PlayerSystem;
    this.registry = cfg.registry as GameRegistry;
    this.didInit = true;
    logger.info('Initialised');
  }

  spawnEnemies(playerX: number, playerY: number): void {
    const roster: { id: string; weight: number }[] = [
      { id: 'hollow_husk', weight: 40 },
      { id: 'scabrous_rat', weight: 35 },
      { id: 'grave_archer', weight: 25 },
    ];

    let spawnCount = 8;
    for (let i = 0; i < spawnCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * 200;
      const ex = playerX + Math.cos(angle) * dist;
      const ey = playerY + Math.sin(angle) * dist;

      const roll = Math.random() * 100;
      let cumulative = 0;
      let chosenId = 'hollow_husk';
      for (const entry of roster) {
        cumulative += entry.weight;
        if (roll < cumulative) { chosenId = entry.id; break; }
      }

      const config = this.registry.enemies.getOrNull(chosenId);
      if (!config) continue;

      const entity = createEnemy(config, ex, ey);
      const size = ENEMY_SIZES[chosenId] || { w: 28, h: 32 };
      const color = ENEMY_COLORS[chosenId] || 0x888888;
      const sprite = this.scene.add.rectangle(ex, ey, size.w, size.h, color, 1);
      sprite.setDepth(ey);

      this.enemySprites.push({ entity, sprite });
    }
    logger.info('Spawned enemies', { count: spawnCount });
  }

  update(delta: number): void {
    if (!this.didInit) return;

    const player = this.playerSystem.getPlayer();

    for (const es of this.enemySprites) {
      this.updateEnemyAI(es, player, delta);
      es.sprite.setPosition(es.entity.position.x, es.entity.position.y);
      es.sprite.setDepth(es.entity.position.y);
    }
  }

  destroy(): void {
    for (const es of this.enemySprites) {
      es.sprite.destroy();
    }
    this.enemySprites = [];
    logger.info('Destroyed');
  }

  getEnemies(): readonly EnemySprite[] {
    return this.enemySprites;
  }

  getAliveEnemies(): EnemySprite[] {
    return this.enemySprites.filter((es) => es.entity.state !== 'dead');
  }

  removeEnemy(enemyId: string): void {
    const idx = this.enemySprites.findIndex((es) => es.entity.id === enemyId);
    if (idx === -1) return;
    const es = this.enemySprites[idx];
    es.sprite.destroy();
    this.enemySprites.splice(idx, 1);
  }

  private updateEnemyAI(es: EnemySprite, player: { position: { x: number; y: number } }, delta: number): void {
    const e = es.entity;
    const dx = player.position.x - e.position.x;
    const dy = player.position.y - e.position.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    e.stateTimer += delta;

    switch (e.state) {
      case 'idle': this.aiIdle(es, distToPlayer, delta); break;
      case 'alert': this.aiAlert(es, dx, dy, distToPlayer, delta); break;
      case 'attack_windup': this.aiWindup(es); break;
      case 'attack_cooldown': this.aiCooldown(es, distToPlayer, delta); break;
      case 'dead': this.aiDead(es, delta); break;
    }
  }

  private aiIdle(es: EnemySprite, distToPlayer: number, delta: number): void {
    const e = es.entity;
    e.wanderTimer += delta;
    if (e.wanderTimer > 2 + Math.random() * 2) {
      e.wanderAngle = Math.random() * Math.PI * 2;
      e.wanderTimer = 0;
    }
    e.position.x += Math.cos(e.wanderAngle) * e.moveSpeed * 0.3 * delta;
    e.position.y += Math.sin(e.wanderAngle) * e.moveSpeed * 0.3 * delta;

    const detectPx = e.detectionRadius * 32;
    if (distToPlayer < detectPx) {
      e.state = 'alert';
      e.stateTimer = 0;
    }
  }

  private aiAlert(es: EnemySprite, dx: number, dy: number, distToPlayer: number, delta: number): void {
    const e = es.entity;
    if (distToPlayer > 0.1) {
      e.position.x += (dx / distToPlayer) * e.moveSpeed * delta;
      e.position.y += (dy / distToPlayer) * e.moveSpeed * delta;
    }

    const attackPx = e.attackRange * 32;
    if (distToPlayer < attackPx) {
      e.state = 'attack_windup';
      e.stateTimer = 0;
      es.sprite.setFillStyle(0xffff44);
    }
  }

  private aiWindup(es: EnemySprite): void {
    const e = es.entity;
    if (e.stateTimer >= 0.5) {
      e.state = 'attack_strike';
      e.attackCooldown = 1.0 + Math.random() * 0.5;

      const originalColor = ENEMY_COLORS[e.configId] || 0x888888;
      es.sprite.setFillStyle(originalColor);

      const player = this.playerSystem.getPlayer();
      EventBus.getInstance().emit(GameEvent.COMBAT_PLAYER_HIT, {
        attackerId: e.id,
        targetId: 'player',
        damage: e.damage,
        rawDamage: e.damage,
        damageType: 'physical',
        isCrit: false,
        ailmentApplied: null,
        hitPosition: { x: player.position.x, y: player.position.y },
      });
    }
  }

  private aiCooldown(es: EnemySprite, distToPlayer: number, _delta: number): void {
    const e = es.entity;
    if (e.stateTimer >= e.attackCooldown) {
      const attackPx = e.attackRange * 32;
      if (distToPlayer < attackPx) {
        e.state = 'attack_windup';
        e.stateTimer = 0;
        es.sprite.setFillStyle(0xffff44);
      } else {
        e.state = 'alert';
        e.stateTimer = 0;
      }
    }
  }

  private aiDead(es: EnemySprite, delta: number): void {
    const e = es.entity;
    es.sprite.setAlpha(Math.max(0, 1 - e.stateTimer / 2));
    if (e.stateTimer >= 2) {
      this.removeEnemy(e.id);
    }
  }

  markAsDead(enemyId: string): void {
    const es = this.enemySprites.find((s) => s.entity.id === enemyId);
    if (!es || es.entity.state === 'dead') return;
    es.entity.state = 'dead';
    es.entity.stateTimer = 0;
  }

  isAlive(enemyId: string): boolean {
    const es = this.enemySprites.find((s) => s.entity.id === enemyId);
    return es ? es.entity.state !== 'dead' : false;
  }
}
