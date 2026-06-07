export interface PlayerEntity {
  classId: string;
  position: { x: number; y: number };
  facingAngle: number;
  moveSpeed: number;
  health: number;
  maxHealth: number;
  resource: number;
  maxResource: number;
  resourceType: string;
  level: number;
  experience: number;
  experienceToNext: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  armour: number;
  evasion: number;
}

export function createPlayerEntity(
  classId: string,
  config: {
    health: number;
    maxResource: number;
    resourceRegen: number;
    moveSpeed: number;
    resourceType: string;
  },
  startX: number,
  startY: number,
  stats?: { strength: number; dexterity: number; intelligence: number; armour: number; evasion: number },
): PlayerEntity {
  return {
    classId,
    position: { x: startX, y: startY },
    facingAngle: 0,
    moveSpeed: config.moveSpeed,
    health: config.health,
    maxHealth: config.health,
    resource: config.maxResource,
    maxResource: config.maxResource,
    resourceType: config.resourceType,
    level: 1,
    experience: 0,
    experienceToNext: 100,
    strength: stats?.strength ?? 0,
    dexterity: stats?.dexterity ?? 0,
    intelligence: stats?.intelligence ?? 0,
    armour: stats?.armour ?? 0,
    evasion: stats?.evasion ?? 0,
  };
}
