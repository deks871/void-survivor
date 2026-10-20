/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, Trophy, Skull, Clock, Sparkles, CheckCircle2, Home } from 'lucide-react';
import { audioSystem } from '../game/audio.ts';

interface GameOverModalProps {
  playerName: string;
  rankResult: { rank: number; isTop5: boolean } | null;
  summary: {
    survivalSeconds: number;
    kills: number;
    level: number;
    score: number;
    gemsCollected: number;
  };
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
  onBackToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  playerName,
  rankResult,
  summary,
  onPlayAgain,
  onOpenLeaderboard,
  onBackToTitle,
}) => {
  const mins = Math.floor(summary.survivalSeconds / 60);
  const secs = summary.survivalSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-md flex flex-col items-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-rose-500/60 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] animate-in fade-in zoom-in-95 my-auto">
        {/* Game Over header */}
        <div className="text-center mb-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs font-mono font-bold tracking-widest mb-2 shadow-sm">
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>SINYAL VITAL HILANG</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-pixel text-rose-400 tracking-wider">
            GAME OVER
          </h2>
        </div>

        {/* Total Score display */}
        <div className="w-full bg-slate-900/90 border border-rose-500/30 rounded-xl p-3.5 text-center mb-3.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
            SKOR RUN ({playerName})
          </span>
          <span className="text-3xl sm:text-4xl font-pixel font-bold text-amber-300 tracking-wider tabular-nums drop-shadow-[0_0_12px_rgba(252,211,77,0.4)]">
            {summary.score}
          </span>
        </div>

        {/* Run metrics tiles */}
        <div className="w-full grid grid-cols-3 gap-2 mb-3.5 font-mono">
          <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-[10px] text-slate-400">WAKTU</span>
            <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums">{timeFormatted}</span>
          </div>

          <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Skull className="w-4 h-4 text-rose-400 mb-1" />
            <span className="text-[10px] text-slate-400">KILLS</span>
            <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums">{summary.kills}</span>
          </div>

          <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Sparkles className="w-4 h-4 text-purple-400 mb-1" />
            <span className="text-[10px] text-slate-400">LEVEL</span>
            <span className="text-xs sm:text-sm font-bold text-slate-200 tabular-nums">{summary.level}</span>
          </div>
        </div>

        {/* Auto-Saved Run Confirmation */}
        <div className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3.5 mb-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-mono font-bold text-xs mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>RIWAYAT SKOR TERSIMPAN!</span>
          </div>
          <p className="text-xs font-mono text-slate-200">
            Astronaut: <span className="font-bold text-cyan-300">{playerName}</span>
            {rankResult && (
              <span className="block mt-1 text-amber-300 font-bold">
                {rankResult.isTop5
                  ? `🏆 Masuk Peringkat #${rankResult.rank} di Top 5 Riwayat Skor!`
                  : `Tercatat di Peringkat #${rankResult.rank}`}
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2">
          <button
            data-start="true"
            onClick={() => {
              audioSystem.playClick();
              onPlayAgain();
            }}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-pixel text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer hover:scale-[1.02] active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>MAIN LAGI</span>
          </button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => {
                audioSystem.playClick();
                onOpenLeaderboard();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-mono text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-600/40 hover:bg-amber-900/50 hover:border-amber-400 transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">TOP 5 SKOR</span>
            </button>

            <button
              onClick={() => {
                audioSystem.playClick();
                onBackToTitle();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-mono text-xs font-bold text-slate-300 bg-slate-900/80 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">MENU UTAMA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
