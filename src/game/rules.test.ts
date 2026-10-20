/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateXpNeeded,
  calculateScore,
  checkCircleCollision,
  getDistance,
  getWaveDifficulty,
  applyUpgrade,
  INITIAL_PLAYER_STATS,
  generateUpgradeOptions,
  rollPowerUpDrop,
  POWER_UP_CONFIGS,
  resolvePlayerName,
  DEFAULT_PLAYER_NAME,
} from './rules.ts';

test('calculateXpNeeded scales progressively with level', () => {
  assert.equal(calculateXpNeeded(1), 10);
  assert.equal(calculateXpNeeded(2), 22);
  assert.equal(calculateXpNeeded(5), 58);
  assert.ok(calculateXpNeeded(10) > calculateXpNeeded(5));
  assert.ok(calculateXpNeeded(20) > calculateXpNeeded(10));
});

test('calculateScore accounts for survival time, kills, and gems', () => {
  const score1 = calculateScore(60, 10, 2, 15);
  // 60*15 + 10*50 + 1*300 + 15*5 = 900 + 500 + 300 + 75 = 1775
  assert.equal(score1, 1775);

  const higherKills = calculateScore(60, 20, 2, 15);
  assert.ok(higherKills > score1);
});

test('checkCircleCollision accurately detects intersecting circles', () => {
  // Touching or overlapping
  assert.equal(checkCircleCollision(0, 0, 10, 15, 0, 10), true); // dist 15 <= 20
  assert.equal(checkCircleCollision(0, 0, 10, 20, 0, 10), true); // exactly touching dist 20 == 20
  // Separated
  assert.equal(checkCircleCollision(0, 0, 10, 25, 0, 10), false); // dist 25 > 20
});

test('getDistance computes Euclidean distance accurately', () => {
  assert.equal(getDistance(0, 0, 3, 4), 5);
  assert.equal(getDistance(10, 10, 10, 10), 0);
});

test('getWaveDifficulty increases difficulty over minutes', () => {
  const diffEarly = getWaveDifficulty(10);
  const diffLate = getWaveDifficulty(180);

  assert.equal(diffEarly.minute, 0);
  assert.equal(diffLate.minute, 3);
  assert.ok(diffLate.enemyMaxHpMultiplier > diffEarly.enemyMaxHpMultiplier);
  assert.ok(diffLate.spawnCount >= diffEarly.spawnCount);
  assert.ok(diffLate.maxActiveEnemies > diffEarly.maxActiveEnemies);
  assert.equal(diffEarly.allowGoliath, false);
  assert.equal(diffLate.allowGoliath, true);
});

test('applyUpgrade correctly updates player stats', () => {
  const stats = { ...INITIAL_PLAYER_STATS };
  
  // Upgrade laser
  const withLaser2 = applyUpgrade(stats, 'upgrade_laser');
  assert.equal(withLaser2.laserLevel, 2);
  assert.ok(withLaser2.laserDamage > stats.laserDamage);

  // Upgrade orbital
  const withOrbital = applyUpgrade(stats, 'upgrade_orbital');
  assert.equal(withOrbital.orbitalLevel, 1);
  assert.equal(withOrbital.orbitalCount, 1);

  // Boost speed
  const withSpeed = applyUpgrade(stats, 'boost_speed');
  assert.ok(withSpeed.moveSpeed > stats.moveSpeed);

  // Boost health
  const withHp = applyUpgrade(stats, 'boost_health');
  assert.equal(withHp.maxHp, stats.maxHp + 30);
});

test('generateUpgradeOptions returns 3 distinct upgrades', () => {
  const options = generateUpgradeOptions(INITIAL_PLAYER_STATS);
  assert.equal(options.length, 3);
  const ids = new Set(options.map(o => o.id));
  assert.equal(ids.size, 3);
});

test('rollPowerUpDrop maps probability ranges to the 4 power-up types', () => {
  assert.equal(rollPowerUpDrop(0.01), 'nanite_heart');
  assert.equal(rollPowerUpDrop(0.049), 'nanite_heart');
  assert.equal(rollPowerUpDrop(0.055), 'shield_overload');
  assert.equal(rollPowerUpDrop(0.079), 'shield_overload');
  assert.equal(rollPowerUpDrop(0.085), 'weapon_overdrive');
  assert.equal(rollPowerUpDrop(0.099), 'weapon_overdrive');
  assert.equal(rollPowerUpDrop(0.105), 'gravity_vacuum');
  assert.equal(rollPowerUpDrop(0.119), 'gravity_vacuum');
  assert.equal(rollPowerUpDrop(0.15), null);
  assert.equal(rollPowerUpDrop(0.95), null);

  assert.equal(POWER_UP_CONFIGS.nanite_heart.floatingText, '+HP REGEN!');
  assert.equal(POWER_UP_CONFIGS.shield_overload.floatingText, 'SHIELD UP!');
  assert.equal(POWER_UP_CONFIGS.weapon_overdrive.floatingText, 'FRENZY!');
  assert.equal(POWER_UP_CONFIGS.gravity_vacuum.floatingText, 'VACUUM!');
});

test('resolvePlayerName trims input and falls back to Astronaut when empty', () => {
  assert.equal(DEFAULT_PLAYER_NAME, 'Astronaut');
  assert.equal(resolvePlayerName(''), 'Astronaut');
  assert.equal(resolvePlayerName('   '), 'Astronaut');
  assert.equal(resolvePlayerName(null), 'Astronaut');
  assert.equal(resolvePlayerName(undefined), 'Astronaut');
  assert.equal(resolvePlayerName('  KAPT-NEO  '), 'KAPT-NEO');
  assert.equal(resolvePlayerName('12345678901234567890'), '1234567890123456');
});


