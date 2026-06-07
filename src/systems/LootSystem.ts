import type Phaser from 'phaser';
import type { ISystem } from '../core/ISystem';
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { GameEvent } from '../core/GameEvent';
import type { GameRegistry } from '../core/GameRegistry';
import type { PlayerSystem } from './PlayerSystem';
import type { EnemySystem } from './EnemySystem';
import type { InventorySystem } from './InventorySystem';
import type { Item } from '../entities/Item';
import { getRarityColor, getRarityHtmlColor } from '../entities/Item';
import { generateLootDrop } from './ItemGenerator';

const logger = Logger.forSystem('LOOT');
const PICKUP_RANGE = 30;

interface GroundItem {
  item: Item;
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
}

export class LootSystem implements ISystem {
  readonly name = 'LootSystem';
  readonly logger = Logger.forSystem('LOOT');

  private scene!: Phaser.Scene;
  private playerSystem!: PlayerSystem;
  private enemySystem!: EnemySystem;
  private inventorySystem!: InventorySystem;
  private registry!: GameRegistry;
  private didInit = false;

  private groundItems: GroundItem[] = [];
  private playerGold = 0;

  init(config?: Record<string, unknown>): void {
    const cfg = config as any;
    this.scene = cfg.scene as Phaser.Scene;
    this.playerSystem = cfg.playerSystem as PlayerSystem;
    this.enemySystem = cfg.enemySystem as EnemySystem;
    this.registry = cfg.registry as GameRegistry;
    if (cfg.inventorySystem) {
      this.inventorySystem = cfg.inventorySystem as InventorySystem;
    }

    EventBus.getInstance().on(GameEvent.COMBAT_KILL, this.onKill, this);

    this.didInit = true;
    logger.info('Initialised');
  }

  destroy(): void {
    for (const gi of this.groundItems) {
      gi.sprite.destroy();
      gi.label.destroy();
    }
    this.groundItems = [];
    EventBus.getInstance().offAll(this);
    logger.info('Destroyed');
  }

  update(_delta: number): void {
    if (!this.didInit) return;
    this.checkPickup();
  }

  getGold(): number { return this.playerGold; }

  private onKill(payload: any): void {
    if (!payload) return;

    const enemySprites = (this.enemySystem as any).enemySprites as { entity: { id: string; position: { x: number; y: number } }; sprite: Phaser.GameObjects.Rectangle }[] | undefined;
    const deadEnemy = enemySprites?.find((e) => e.entity.id === payload.targetId);
    const pos = deadEnemy ? deadEnemy.entity.position : { x: 960, y: 540 };

    const result = generateLootDrop(payload.enemyConfigId, 2, this.registry);

    if (result.gold > 0) {
      this.playerGold += result.gold;
      EventBus.getInstance().emit('player:gold_changed' as any, { gold: this.playerGold, gained: result.gold });
    }

    if (result.item) {
      this.spawnGroundItem(result.item, pos.x, pos.y);
    }
  }

  private spawnGroundItem(item: Item, x: number, y: number): void {
    const rarityColor = getRarityColor(item.rarity);
    const htmlColor = getRarityHtmlColor(item.rarity);

    const sprite = this.scene.add.rectangle(x, y - 8, 16, 16, rarityColor, 1);
    sprite.setDepth(9999);

    const label = this.scene.add.text(x, y - 24, item.name, {
      color: htmlColor,
      fontSize: '11px',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10000).setAlpha(0.9);

    this.groundItems.push({ item, sprite, label, x, y });
  }

  private checkPickup(): void {
    const player = this.playerSystem.getPlayer();
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gi = this.groundItems[i];
      const dx = player.position.x - gi.x;
      const dy = player.position.y - gi.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PICKUP_RANGE) {
        if (this.inventorySystem) {
          const added = this.inventorySystem.addItem(gi.item);
          if (!added) {
            logger.warn('Inventory full, item stays on ground', { itemId: gi.item.id });
            continue;
          }
        }
        gi.sprite.destroy();
        gi.label.destroy();
        this.groundItems.splice(i, 1);
        logger.info('Item picked up', { itemId: gi.item.id, name: gi.item.name });
      }
    }
  }
}
