/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HighScoreRecord {
  id: string;
  name: string;
  score: number;
  survivalSeconds: number;
  kills: number;
  levelReached: number;
  date: string;
}

export interface LifetimeStats {
  gamesPlayed: number;
  totalKills: number;
  maxSurvivalSeconds: number;
  bestScore: number;
}

const STORAGE_KEY_SCORES = 'void_survivor_scores_real_v2';
const STORAGE_KEY_STATS = 'void_survivor_stats_real_v2';
const STORAGE_KEY_PLAYERNAME = 'void_survivor_last_player_name';

// Names of dummy bots to filter out unconditionally
const DUMMY_NAMES = new Set(['NOVA-01', 'CYBER-ACE', 'VOID-WALKER']);

/**
 * Returns all real high scores stored locally, sorted by score descending.
 * Cleaned of any dummy/seed data. Starts completely empty if no games played.
 */
export function getStoredHighScores(): HighScoreRecord[] {
  try {
    // Purge old dummy storage if present
    try {
      localStorage.removeItem('void_survivor_scores_v1');
    } catch {}

    const raw = localStorage.getItem(STORAGE_KEY_SCORES);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter out any legacy dummy records by ID or name
    const cleaned = (parsed as HighScoreRecord[]).filter(
      (rec) => rec && rec.name && !DUMMY_NAMES.has(rec.name) && !String(rec.id).startsWith('seed-')
    );

    cleaned.sort((a, b) => b.score - a.score);
    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Returns Top 5 real high score records.
 */
export function getTop5HighScores(): HighScoreRecord[] {
  return getStoredHighScores().slice(0, 5);
}

/**
 * Saves a real game run to localStorage.
 */
export function saveHighScore(entry: Omit<HighScoreRecord, 'id' | 'date'>): {
  rank: number;
  isTop5: boolean;
  record: HighScoreRecord;
} {
  try {
    const current = getStoredHighScores();

    // Format local date with time: e.g. 20 Okt 2026, 15:30
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRecord: HighScoreRecord = {
      ...entry,
      id: 'run_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: dateFormatted,
    };

    current.push(newRecord);
    current.sort((a, b) => b.score - a.score);

    const rank = current.findIndex((r) => r.id === newRecord.id) + 1;
    // Keep top 20 real runs in storage
    const trimmed = current.slice(0, 20);

    localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(trimmed));
    updateLifetimeStats(entry.survivalSeconds, entry.kills, entry.score);

    return {
      rank,
      isTop5: rank <= 5,
      record: newRecord,
    };
  } catch {
    const fallbackRecord: HighScoreRecord = {
      ...entry,
      id: 'fallback_' + Date.now(),
      date: new Date().toLocaleDateString('id-ID'),
    };
    return { rank: 1, isTop5: true, record: fallbackRecord };
  }
}

export function clearAllHighScores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_SCORES);
  } catch {}
}

export function getLifetimeStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (!raw) {
      return { gamesPlayed: 0, totalKills: 0, maxSurvivalSeconds: 0, bestScore: 0 };
    }
    return JSON.parse(raw);
  } catch {
    return { gamesPlayed: 0, totalKills: 0, maxSurvivalSeconds: 0, bestScore: 0 };
  }
}

function updateLifetimeStats(time: number, kills: number, score: number) {
  try {
    const current = getLifetimeStats();
    current.gamesPlayed += 1;
    current.totalKills += kills;
    current.maxSurvivalSeconds = Math.max(current.maxSurvivalSeconds, Math.floor(time));
    current.bestScore = Math.max(current.bestScore, score);
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(current));
  } catch {}
}

export function getLastPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_PLAYERNAME) || '';
  } catch {
    return '';
  }
}

export function setLastPlayerName(name: string) {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYERNAME, name.trim().slice(0, 16));
  } catch {}
}
