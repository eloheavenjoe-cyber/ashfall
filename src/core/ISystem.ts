import type { ILogger } from './Logger';
import type { ZoneConfig } from '../data/dataConfigs';
export type { ZoneConfig };

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
