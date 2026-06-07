import type { ILogger } from './Logger';

export interface ZoneConfig {
  zoneId: string;
  displayName: string;
  act: number;
  zoneLevel: number;
  tileset: string;
  layoutType: 'linear' | 'branching' | 'open' | 'dungeon' | 'boss_antechamber';
  size: 'small' | 'medium' | 'large';
  enemyRoster: { enemyId: string; weight: number }[];
  rareEnemyChance: number;
  magicEnemyChance: number;
  density: 'low' | 'medium' | 'high' | 'extreme';
  pois: {
    boss: boolean;
    shrines: { min: number; max: number };
    chests: { min: number; max: number };
  };
  ambientColour: string;
  musicTrack: string;
  connections: string[];
}

export interface ISystem {
  readonly name: string;
  readonly logger: ILogger;

  init(config?: Record<string, unknown>): void;
  update(delta: number): void;
  destroy(): void;

  onSceneReady?(): void;
  onZoneLoad?(zoneConfig: ZoneConfig): void;
  onZoneExit?(): void;
}
