export interface HitResult {
  damage: number;
  rawDamage: number;
  isCrit: boolean;
}

export function calcDamage(
  baseDamage: number,
  skillMultiplier: number,
  critChance = 0.05,
  critMultiplier = 1.5,
): HitResult {
  const minDamage = baseDamage * 0.8;
  const maxDamage = baseDamage * 1.2;
  const roll = minDamage + Math.random() * (maxDamage - minDamage);
  const raw = Math.round(roll * skillMultiplier);

  const isCrit = Math.random() < critChance;
  const mult = isCrit ? critMultiplier : 1.0;

  return { damage: Math.round(raw * mult), rawDamage: raw, isCrit };
}

export function applyMitigation(damage: number, armour: number): number {
  return Math.max(1, Math.round(damage - armour));
}
