import { Logger } from './Logger';
import type { GameRegistry } from './GameRegistry';

const logger = Logger.forSystem('DATA_LOADER');

interface LoadSpec {
  path: string;
  registryKey: keyof GameRegistry;
  typeName: string;
}

const BASE = import.meta.env.BASE_URL;

const LOAD_SPECS: LoadSpec[] = [
  { path: `${BASE}data/enemies.json`,  registryKey: 'enemies', typeName: 'EnemyConfig' },
  { path: `${BASE}data/items.json`,    registryKey: 'items',   typeName: 'ItemBaseConfig' },
  { path: `${BASE}data/affixes.json`,  registryKey: 'affixes', typeName: 'AffixConfig' },
  { path: `${BASE}data/skills.json`,   registryKey: 'skills',  typeName: 'SkillConfig' },
  { path: `${BASE}data/classes.json`,  registryKey: 'classes', typeName: 'ClassConfig' },
  { path: `${BASE}data/zones.json`,    registryKey: 'zones',   typeName: 'ZoneConfig' },
  { path: `${BASE}data/currency.json`, registryKey: 'currency', typeName: 'CurrencyConfig' },
  { path: `${BASE}data/passives.json`, registryKey: 'passives',typeName: 'PassiveNodeConfig' },
];

interface Loadable {
  register: (id: string, entry: unknown) => void;
}

export async function loadAllData(registry: Record<string, Loadable>): Promise<void> {
  logger.info('Loading all game data');

  let totalCount = 0;
  for (const spec of LOAD_SPECS) {
    try {
      const response = await fetch(spec.path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const reg = registry[spec.registryKey];
      if (!reg || typeof reg.register !== 'function') {
        throw new Error(`Registry key '${spec.registryKey}' not found or invalid`);
      }
      let count = 0;
      for (const entry of data) {
        reg.register(entry.id, entry);
        count++;
      }
      logger.info(`Loaded ${spec.typeName}`, { path: spec.path, count });
      totalCount += count;
    } catch (err) {
      logger.fatal(`Failed to load ${spec.typeName}`, {
        path: spec.path,
        error: String(err),
      });
      throw err;
    }
  }

  logger.info('All game data loaded', { totalRegistered: totalCount });
}
