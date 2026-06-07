import type { ISystem } from './ISystem';
import { Logger } from './Logger';

const logger = Logger.forSystem('SYSTEM_MGR');

export class SystemManager {
  private systems: ISystem[] = [];
  private systemMap = new Map<string, ISystem>();

  add(system: ISystem): void {
    if (this.systemMap.has(system.name)) {
      logger.warn('System already registered, skipping', { name: system.name });
      return;
    }
    this.systems.push(system);
    this.systemMap.set(system.name, system);
    logger.info('System registered', { name: system.name });
  }

  remove(name: string): ISystem | undefined {
    const system = this.systemMap.get(name);
    if (!system) return undefined;
    this.systems = this.systems.filter((s) => s.name !== name);
    this.systemMap.delete(name);
    system.destroy();
    logger.info('System removed', { name });
    return system;
  }

  initAll(config?: Record<string, unknown>): void {
    logger.info('Initialising all systems', { count: this.systems.length });
    for (const system of this.systems) {
      try {
        system.init(config);
        logger.debug('System initialised', { name: system.name });
      } catch (err) {
        logger.error('System init failed', { name: system.name, error: String(err) });
      }
    }
  }

  updateAll(delta: number): void {
    for (const system of this.systems) {
      try {
        system.update(delta);
      } catch (err) {
        logger.error('System update threw exception', {
          system: system.name,
          error: String(err),
        });
      }
    }
  }

  destroyAll(): void {
    logger.info('Destroying all systems');
    for (const system of [...this.systems].reverse()) {
      try {
        system.destroy();
      } catch (err) {
        logger.error('System destroy failed', { name: system.name, error: String(err) });
      }
    }
    this.systems = [];
    this.systemMap.clear();
  }

  fireSceneReady(): void {
    for (const system of this.systems) {
      system.onSceneReady?.();
    }
  }

  fireZoneLoad(config: Record<string, unknown>): void {
    for (const system of this.systems) {
      system.onZoneLoad?.(config as any);
    }
  }

  fireZoneExit(): void {
    for (const system of this.systems) {
      system.onZoneExit?.();
    }
  }

  get<T extends ISystem>(name: string): T | undefined {
    return this.systemMap.get(name) as T | undefined;
  }

  getAll(): readonly ISystem[] {
    return [...this.systems];
  }

  count(): number {
    return this.systems.length;
  }
}
