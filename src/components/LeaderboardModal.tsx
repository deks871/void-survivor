/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, X, Skull, Clock, Award, Trash2 } from 'lucide-react';
import { getTop5HighScores, clearAllHighScores, HighScoreRecord } from '../game/storage.ts';
import { audioSystem } from '../game/audio.ts';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [top5Scores, setTop5Scores] = useState<HighScoreRecord[]>([]);

  useEffect(() => {
    setTop5Scores(getTop5HighScores());
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClearHistory = () => {
    if (window.confirm('Yakin ingin mereset seluruh riwayat permainan lokal Anda?')) {
      clearAllHighScores();
      setTop5Scores([]);
      audioSystem.playClick();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 pointer-events-auto">
      <div className="w-full max-w-lg flex flex-col bg-slate-950 border border-amber-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-base sm:text-lg font-pixel text-amber-300">
                TOP 5 RIWAYAT SKOR
              </h2>
              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                Riwayat Lokal Permainan Nyata
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              audioSystem.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup Leaderboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scores Table */}
        <div className="w-full min-h-[220px] max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar flex flex-col justify-center">
          {top5Scores.length === 0 ? (
            <div className="text-center py-10 px-4 my-auto">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-mono text-cyan-200/90 font-bold mb-1">
                Belum ada riwayat permainan. Mainkan sekarang!
              </p>
              <p className="text-[11px] font-mono text-slate-500 max-w-xs mx-auto">
                Selesaikan satu ronde permainan dan simpan nama Anda saat Game Over.
              </p>
            </div>
          ) : (
            top5Scores.map((rec, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div
                  key={rec.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-mono transition-all ${
                    isFirst
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : isSecond
                      ? 'bg-slate-800/40 border-slate-400/30 text-slate-200'
                      : isThird
                      ? 'bg-amber-900/20 border-amber-700/30 text-amber-300'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                  }`}
                >
                  {/* Rank & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isFirst
                          ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                          : isSecond
                          ? 'bg-slate-300 text-slate-950 font-black'
                          : isThird
                          ? 'bg-amber-600 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <span className="font-bold text-sm block truncate tracking-wider text-slate-100">
                        {rec.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-cyan-400" /> {formatTime(rec.survivalSeconds)} ·{' '}
                        <Skull className="w-3 h-3 text-rose-400" /> {rec.kills} · Lv.{rec.levelReached}
                      </span>
                    </div>
                  </div>

                  {/* Score & Date */}
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="font-pixel text-xs sm:text-sm text-amber-300 font-bold tabular-nums">
                      {rec.score}
                    </span>
                    <span className="block text-[9px] text-slate-500 font-sans mt-0.5">
                      {rec.date}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 mt-5">
          {top5Scores.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl font-mono text-xs text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 transition-all cursor-pointer"
              title="Reset Semua Riwayat Skor"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => {
              audioSystem.playClick();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-all cursor-pointer text-center"
          >
            TUTUP
          </button>
        </div>
      </div>
    </div>
  );
};
