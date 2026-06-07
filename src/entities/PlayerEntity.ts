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
}

export function createPlayerEntity(classId: string, config: {
  health: number;
  maxResource: number;
  resourceRegen: number;
  moveSpeed: number;
  resourceType: string;
}, startX: number, startY: number): PlayerEntity {
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
  };
}
