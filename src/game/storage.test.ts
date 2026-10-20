/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node:test environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0,
  } as unknown as Storage;
}

import { getStoredHighScores, getTop5HighScores, saveHighScore, clearAllHighScores } from './storage.ts';

test('getStoredHighScores starts empty with no dummy data', () => {
  clearAllHighScores();
  const scores = getStoredHighScores();
  assert.deepEqual(scores, []);
  assert.equal(scores.length, 0);
});

test('saveHighScore saves real run data and orders by score', () => {
  clearAllHighScores();

  const r1 = saveHighScore({
    name: 'ALFA',
    score: 1200,
    survivalSeconds: 65,
    kills: 14,
    levelReached: 3,
  });
  assert.equal(r1.rank, 1);
  assert.equal(r1.isTop5, true);

  const r2 = saveHighScore({
    name: 'BETA',
    score: 2500,
    survivalSeconds: 110,
    kills: 28,
    levelReached: 5,
  });
  assert.equal(r2.rank, 1); // BETA has higher score, so rank 1

  const top5 = getTop5HighScores();
  assert.equal(top5.length, 2);
  assert.equal(top5[0].name, 'BETA');
  assert.equal(top5[1].name, 'ALFA');
});

test('getTop5HighScores limits to maximum 5 records', () => {
  clearAllHighScores();

  for (let i = 1; i <= 8; i++) {
    saveHighScore({
      name: `PLAYER_${i}`,
      score: i * 500,
      survivalSeconds: i * 30,
      kills: i * 10,
      levelReached: i,
    });
  }

  const top5 = getTop5HighScores();
  assert.equal(top5.length, 5);
  // Highest is PLAYER_8 (4000)
  assert.equal(top5[0].name, 'PLAYER_8');
  assert.equal(top5[0].score, 4000);
});
