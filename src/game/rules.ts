/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerStats {
  maxHp: number;
  hp: number;
  moveSpeed: number;
  magnetRadius: number;
  hpRegenPerSec: number;
  damageMultiplier: number;
  cooldownReduction: number; // 0 to 0.5 (max 50% faster attacks)
  // Weapon states
  laserLevel: number;
  laserDamage: number;
  laserCooldown: number;
  laserProjectiles: number;
  laserPierce: number;
  
  orbitalLevel: number;
  orbitalCount: number;
  orbitalDamage: number;
  orbitalRadius: number;
  orbitalSpeed: number;

  shieldLevel: number;
  shieldMax: number;
  shieldRechargeTime: number; // seconds
}

export interface UpgradeOption {
  id: string;
  category: 'weapon' | 'stat';
  name: string;
  description: string;
  icon: string;
  tier: number;
  maxTier: number;
  color: string;
}

export const INITIAL_PLAYER_STATS: PlayerStats = {
  maxHp: 100,
  hp: 100,
  moveSpeed: 210, // pixels per second
  magnetRadius: 100,
  hpRegenPerSec: 0,
  damageMultiplier: 1.0,
  cooldownReduction: 0,

  laserLevel: 1,
  laserDamage: 25,
  laserCooldown: 1.0, // seconds
  laserProjectiles: 1,
  laserPierce: 1,

  orbitalLevel: 0,
  orbitalCount: 0,
  orbitalDamage: 18,
  orbitalRadius: 75,
  orbitalSpeed: 2.4,

  shieldLevel: 0,
  shieldMax: 0,
  shieldRechargeTime: 12,
};

/**
 * Calculates XP required to advance from current level to next.
 * Progressive scaling typical of survivor games.
 */
export function calculateXpNeeded(level: number): number {
  if (level <= 1) return 10;
  if (level <= 5) return 10 + (level - 1) * 12;
  if (level <= 10) return 60 + (level - 5) * 20;
  if (level <= 20) return 160 + (level - 10) * 35;
  return 510 + (level - 20) * 55;
}

/**
 * Calculates total run score based on survival time, kills, level, and gems.
 */
export function calculateScore(secondsAlive: number, kills: number, level: number, gemsCollected: number): number {
  const timeScore = Math.floor(secondsAlive) * 15;
  const killScore = kills * 50;
  const levelScore = (level - 1) * 300;
  const gemScore = gemsCollected * 5;
  return timeScore + killScore + levelScore + gemScore;
}

/**
 * Circle collision detection.
 */
export function checkCircleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radii = r1 + r2;
  return distSq <= radii * radii;
}

/**
 * Distance between two points.
 */
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

/**
 * Wave difficulty parameters based on survival time in seconds.
 */
export interface WaveDifficulty {
  minute: number;
  spawnInterval: number; // seconds between spawn bursts
  spawnCount: number; // how many spawn each interval
  enemyMaxHpMultiplier: number;
  enemySpeedMultiplier: number;
  maxActiveEnemies: number;
  allowSpitter: boolean;
  allowGoliath: boolean;
  allowElite: boolean;
}

export function getWaveDifficulty(elapsedSeconds: number): WaveDifficulty {
  const minute = Math.floor(elapsedSeconds / 60);
  
  // Base values ramp up smoothly with seconds - gentle early opening
  const ramp = elapsedSeconds / 60;
  // Opening 12 seconds: slow spawn so player can orient
  const initialEase = Math.min(1, elapsedSeconds / 12);
  const spawnInterval = Math.max(0.35, 2.0 - ramp * 0.25);
  const spawnCount = Math.min(10, Math.max(1, Math.floor(1 + initialEase * 1.2 + ramp * 1.5)));
  const enemyMaxHpMultiplier = 1 + ramp * 0.45;
  const enemySpeedMultiplier = Math.min(1.65, 0.9 + ramp * 0.12);
  const maxActiveEnemies = Math.min(250, Math.floor(25 + ramp * 25));

  return {
    minute,
    spawnInterval,
    spawnCount,
    enemyMaxHpMultiplier,
    enemySpeedMultiplier,
    maxActiveEnemies,
    allowSpitter: elapsedSeconds >= 35,
    allowGoliath: elapsedSeconds >= 80,
    allowElite: elapsedSeconds >= 60 && Math.floor(elapsedSeconds) % 60 <= 8,
  };
}

/**
 * Generates 3 unique upgrade options based on current player stats.
 */
export function generateUpgradeOptions(stats: PlayerStats): UpgradeOption[] {
  const allPossible: UpgradeOption[] = [];

  // 1. Aero Laser upgrades
  if (stats.laserLevel < 5) {
    let desc = '';
    if (stats.laserLevel === 1) desc = 'Fire Rate +25% & Damage +20%';
    else if (stats.laserLevel === 2) desc = '+1 Projectile (Menembak 2 laser sekaligus)';
    else if (stats.laserLevel === 3) desc = 'Laser Pierce +1 (Menembus 2 musuh)';
    else if (stats.laserLevel === 4) desc = 'Overdrive Laser (+1 Proyektil & Cooldown -20%)';

    allPossible.push({
      id: 'upgrade_laser',
      category: 'weapon',
      name: stats.laserLevel === 1 ? 'Aero Laser II' : `Aero Laser Lv.${stats.laserLevel + 1}`,
      description: desc,
      icon: 'laser',
      tier: stats.laserLevel + 1,
      maxTier: 5,
      color: '#06b6d4', // Cyan
    });
  }

  // 2. Orbital Plasma
  if (stats.orbitalLevel < 5) {
    let desc = '';
    if (stats.orbitalLevel === 0) desc = 'Senjata Baru: 1 bola plasma memutar yang melukai musuh.';
    else if (stats.orbitalLevel === 1) desc = '+1 Bola Plasma & Kecepatan Putar +25%';
    else if (stats.orbitalLevel === 2) desc = '+1 Bola Plasma & Damage +30%';
    else if (stats.orbitalLevel === 3) desc = 'Radius Putaran Meluas (+20px) & +1 Bola';
    else if (stats.orbitalLevel === 4) desc = 'Plasma Vortex (Kecepatan & Damage maksimal)';

    allPossible.push({
      id: 'upgrade_orbital',
      category: 'weapon',
      name: stats.orbitalLevel === 0 ? 'Orbital Plasma (Baru)' : `Orbital Plasma Lv.${stats.orbitalLevel + 1}`,
      description: desc,
      icon: 'orbital',
      tier: stats.orbitalLevel + 1,
      maxTier: 5,
      color: '#a855f7', // Purple
    });
  }

  // 3. Shield Generator
  if (stats.shieldLevel < 4) {
    let desc = '';
    if (stats.shieldLevel === 0) desc = 'Perisai Energi: Menyerap 25 damage, recharge tiap 10 detik.';
    else if (stats.shieldLevel === 1) desc = 'Kapasitas Shield +25 HP & Recharge 2 detik lebih cepat.';
    else if (stats.shieldLevel === 2) desc = 'Kapasitas Shield +30 HP & Melepaskan shockwave saat pecah.';
    else if (stats.shieldLevel === 3) desc = 'Aegis Shield: Kapasitas 100 HP & Recharge tiap 5 detik.';

    allPossible.push({
      id: 'upgrade_shield',
      category: 'weapon',
      name: stats.shieldLevel === 0 ? 'Shield Generator (Baru)' : `Shield Gen Lv.${stats.shieldLevel + 1}`,
      description: desc,
      icon: 'shield',
      tier: stats.shieldLevel + 1,
      maxTier: 4,
      color: '#3b82f6', // Blue
    });
  }

  // 4. Move Speed Booster
  allPossible.push({
    id: 'boost_speed',
    category: 'stat',
    name: 'Thruster Boots',
    description: 'Kecepatan jalan astronaut bertambah +18%. Lebih lincah menghindar.',
    icon: 'speed',
    tier: 1,
    maxTier: 5,
    color: '#10b981', // Emerald
  });

  // 5. Magnet Extender
  allPossible.push({
    id: 'boost_magnet',
    category: 'stat',
    name: 'Graviton Magnet',
    description: 'Radius hisap Energy Gems meluas +40%. Mempermudah panen XP.',
    icon: 'magnet',
    tier: 1,
    maxTier: 5,
    color: '#f59e0b', // Amber
  });

  // 6. Max Health & Heal
  allPossible.push({
    id: 'boost_health',
    category: 'stat',
    name: 'Titanium Nanobots',
    description: 'Max HP +30 dan langsung memulihkan 40 HP saat dipilih.',
    icon: 'health',
    tier: 1,
    maxTier: 5,
    color: '#ef4444', // Red
  });

  // 7. Damage Multiplier
  allPossible.push({
    id: 'boost_damage',
    category: 'stat',
    name: 'Quantum Reactor',
    description: 'Damage semua senjata meningkat +20%.',
    icon: 'reactor',
    tier: 1,
    maxTier: 5,
    color: '#eab308', // Yellow
  });

  // 8. Health Regeneration
  if (stats.hpRegenPerSec < 3) {
    allPossible.push({
      id: 'boost_regen',
      category: 'stat',
      name: 'Bio-Regenerator',
      description: 'Regenerasi 1 HP per 2 detik secara konstan.',
      icon: 'regen',
      tier: 1,
      maxTier: 3,
      color: '#ec4899', // Pink
    });
  }

  // Shuffle and pick 3 distinct
  const shuffled = [...allPossible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * Applies selected upgrade to player stats.
 */
export function applyUpgrade(stats: PlayerStats, upgradeId: string): PlayerStats {
  const updated: PlayerStats = { ...stats };

  switch (upgradeId) {
    case 'upgrade_laser':
      updated.laserLevel += 1;
      if (updated.laserLevel === 2) {
        updated.laserCooldown *= 0.8;
        updated.laserDamage += 8;
      } else if (updated.laserLevel === 3) {
        updated.laserProjectiles += 1;
      } else if (updated.laserLevel === 4) {
        updated.laserPierce += 1;
      } else if (updated.laserLevel === 5) {
        updated.laserProjectiles += 1;
        updated.laserCooldown *= 0.8;
        updated.laserDamage += 12;
      }
      break;

    case 'upgrade_orbital':
      updated.orbitalLevel += 1;
      if (updated.orbitalLevel === 1) {
        updated.orbitalCount = 1;
      } else if (updated.orbitalLevel === 2) {
        updated.orbitalCount = 2;
        updated.orbitalSpeed = 3.0;
      } else if (updated.orbitalLevel === 3) {
        updated.orbitalCount = 3;
        updated.orbitalDamage += 10;
      } else if (updated.orbitalLevel === 4) {
        updated.orbitalCount = 4;
        updated.orbitalRadius += 20;
      } else if (updated.orbitalLevel === 5) {
        updated.orbitalCount = 5;
        updated.orbitalSpeed = 3.8;
        updated.orbitalDamage += 15;
      }
      break;

    case 'upgrade_shield':
      updated.shieldLevel += 1;
      if (updated.shieldLevel === 1) {
        updated.shieldMax = 25;
        updated.shieldRechargeTime = 10;
      } else if (updated.shieldLevel === 2) {
        updated.shieldMax = 50;
        updated.shieldRechargeTime = 8;
      } else if (updated.shieldLevel === 3) {
        updated.shieldMax = 75;
        updated.shieldRechargeTime = 6;
      } else if (updated.shieldLevel === 4) {
        updated.shieldMax = 100;
        updated.shieldRechargeTime = 5;
      }
      break;

    case 'boost_speed':
      updated.moveSpeed = Math.round(updated.moveSpeed * 1.18);
      break;

    case 'boost_magnet':
      updated.magnetRadius = Math.round(updated.magnetRadius * 1.4);
      break;

    case 'boost_health':
      updated.maxHp += 30;
      updated.hp = Math.min(updated.maxHp, updated.hp + 40);
      break;

    case 'boost_damage':
      updated.damageMultiplier = +(updated.damageMultiplier + 0.2).toFixed(2);
      break;

    case 'boost_regen':
      updated.hpRegenPerSec = +(updated.hpRegenPerSec + 0.5).toFixed(1);
      break;
  }

  return updated;
}

export type PowerUpType = 'nanite_heart' | 'shield_overload' | 'weapon_overdrive' | 'gravity_vacuum';

export interface PowerUpConfig {
  type: PowerUpType;
  name: string;
  floatingText: string;
  color: string;
  glowColor: string;
}

export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  nanite_heart: {
    type: 'nanite_heart',
    name: 'Nanite Heart',
    floatingText: '+HP REGEN!',
    color: '#4ade80', // Green
    glowColor: '#86efac',
  },
  shield_overload: {
    type: 'shield_overload',
    name: 'Shield Overload',
    floatingText: 'SHIELD UP!',
    color: '#38bdf8', // Blue
    glowColor: '#7dd3fc',
  },
  weapon_overdrive: {
    type: 'weapon_overdrive',
    name: 'Weapon Overdrive',
    floatingText: 'FRENZY!',
    color: '#facc15', // Yellow
    glowColor: '#fef08a',
  },
  gravity_vacuum: {
    type: 'gravity_vacuum',
    name: 'Gravity Vacuum',
    floatingText: 'VACUUM!',
    color: '#fbbf24', // Amber/Yellow
    glowColor: '#fde68a',
  },
};

/**
 * Determines if an enemy drops a Power-Up Capsule based on a random roll [0, 1).
 * - Nanite Heart: 5% (0.00 - 0.05)
 * - Shield Overload: 3% (0.05 - 0.08)
 * - Weapon Overdrive: 2% (0.08 - 0.10)
 * - Gravity Vacuum: 2% (0.10 - 0.12)
 */
export function rollPowerUpDrop(roll: number = Math.random()): PowerUpType | null {
  if (roll < 0.05) return 'nanite_heart';
  if (roll < 0.08) return 'shield_overload';
  if (roll < 0.10) return 'weapon_overdrive';
  if (roll < 0.12) return 'gravity_vacuum';
  return null;
}

