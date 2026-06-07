import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { GameRegistry } from '../core/GameRegistry';
import type { PlayerSystem } from './PlayerSystem';

const logger = Logger.forSystem('LEVEL');

export class LevelingSystem implements ISystem {
  readonly name = 'LevelingSystem';
  readonly logger = Logger.forSystem('LEVEL');

  private playerSystem!: PlayerSystem;
  private registry!: GameRegistry;
  private didInit = false;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.playerSystem = cfg.playerSystem as PlayerSystem;
    this.registry = cfg.registry as GameRegistry;

    EventBus.getInstance().on(GameEvent.COMBAT_KILL, this.onKill, this);
    this.didInit = true;
    logger.info('Initialised');
  }

  destroy(): void {
    this.didInit = false;
    EventBus.getInstance().offAll(this);
  }

  update(): void {
    // no per-frame logic
  }

  private onKill = (payload: any): void => {
    if (!payload?.enemyConfigId) return;
    const enemyConfig = this.registry.enemies.getOrNull(payload.enemyConfigId);
    if (!enemyConfig) return;

    const xpGained = enemyConfig.xpReward;
    if (xpGained <= 0) return;

    const player = this.playerSystem.getPlayer();
    player.experience += xpGained;

    EventBus.getInstance().emit(GameEvent.PLAYER_XP_GAINED, { xpGained, total: player.experience, level: player.level });

    let leveledUp = false;
    while (player.experience >= player.experienceToNext) {
      player.experience -= player.experienceToNext;
      player.level++;
      this.applyLevelUp(player);
      player.experienceToNext = this.getXPToNextLevel(player.level);
      leveledUp = true;
    }

    if (leveledUp) {
      EventBus.getInstance().emit(GameEvent.PLAYER_LEVEL_UP, {
        newLevel: player.level,
        oldLevel: player.level - 1,
        totalXP: player.experience,
      });
    }
  }

  private applyLevelUp(player: any): void {
    const classConfig = this.registry.classes.get(player.classId);
    const growth = classConfig.baseStatsPerLevel ?? {};
    player.maxHealth += growth.health ?? 10;
    player.health = player.maxHealth;
    player.strength += growth.strength ?? 0;
    player.dexterity += growth.dexterity ?? 0;
    player.intelligence += growth.intelligence ?? 0;
    player.armour += growth.armour ?? 0;
    player.evasion += growth.evasion ?? 0;
    logger.info('Level up!', { level: player.level, maxHealth: player.maxHealth });
  }

  getXPToNextLevel(level: number): number {
    return Math.round(100 * level * 1.3);
  }
}
