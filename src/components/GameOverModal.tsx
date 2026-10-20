/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Trophy, Skull, Clock, Sparkles, Award, CheckCircle2, UserCheck } from 'lucide-react';
import { saveHighScore, getLastPlayerName, setLastPlayerName } from '../game/storage.ts';
import { audioSystem } from '../game/audio.ts';

interface GameOverModalProps {
  summary: {
    survivalSeconds: number;
    kills: number;
    level: number;
    score: number;
    gemsCollected: number;
  };
  onPlayAgain: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  onPlayAgain,
  onOpenLeaderboard,
}) => {
  const [nickname, setNickname] = useState<string>(getLastPlayerName());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [rankResult, setRankResult] = useState<{ rank: number; isTop5: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const mins = Math.floor(summary.survivalSeconds / 60);
  const secs = summary.survivalSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaved) return;

    const trimmed = nickname.trim() || 'ASTRONAUT';
    setLastPlayerName(trimmed);

    const result = saveHighScore({
      name: trimmed,
      score: summary.score,
      survivalSeconds: summary.survivalSeconds,
      kills: summary.kills,
      levelReached: summary.level,
    });

    setRankResult({ rank: result.rank, isTop5: result.isTop5 });
    setIsSaved(true);
    audioSystem.playLevelUp();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 pointer-events-auto">
      <div className="w-full max-w-md flex flex-col items-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-rose-500/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] animate-in fade-in zoom-in-95">
        {/* Game Over header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs font-mono font-bold tracking-widest mb-2 shadow-sm">
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>SINYAL VITAL HILANG</span>
          </div>
          <h2 className="text-2xl font-pixel text-rose-400 tracking-wider">
            GAME OVER
          </h2>
        </div>

        {/* Total Score display */}
        <div className="w-full bg-slate-900/90 border border-rose-500/30 rounded-xl p-3.5 text-center mb-4">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
            SKOR RUN ANDA
          </span>
          <span className="text-3xl sm:text-4xl font-pixel font-bold text-amber-300 tracking-wider tabular-nums drop-shadow-[0_0_12px_rgba(252,211,77,0.4)]">
            {summary.score}
          </span>
        </div>

        {/* Run metrics tiles */}
        <div className="w-full grid grid-cols-3 gap-2 mb-4 font-mono">
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

        {/* Input Nama Pop-up Form / Saved Confirmation */}
        {!isSaved ? (
          <form onSubmit={handleSubmitName} className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 mb-4">
            <label htmlFor="nickname-input" className="block text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 text-center">
              Masukkan Nickname Anda
            </label>
            <div className="flex gap-2">
              <input
                id="nickname-input"
                ref={inputRef}
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 14))}
                placeholder="NAMA PEMAIN..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs sm:text-sm font-mono font-bold text-slate-100 px-3 py-2.5 rounded-lg outline-none tracking-wider text-center"
                maxLength={14}
                required
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg font-mono text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer whitespace-nowrap"
              >
                SIMPAN
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center mt-2">
              Skor akan disimpan secara lokal ke Top 5 Leaderboard Anda.
            </p>
          </form>
        ) : (
          <div className="w-full bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3.5 mb-4 text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-mono font-bold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>SKOR BERHASIL DISIMPAN!</span>
            </div>
            <p className="text-xs font-mono text-slate-200">
              Player: <span className="font-bold text-cyan-300">{nickname || 'ASTRONAUT'}</span>
              {rankResult && (
                <span className="block mt-1 text-amber-300 font-bold">
                  {rankResult.isTop5 ? `🏆 Masuk Peringkat #${rankResult.rank} di Top 5!` : `Peringkat #${rankResult.rank}`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            data-start="true"
            onClick={() => {
              // If not saved yet, save with current/default name
              if (!isSaved) {
                const trimmed = nickname.trim() || 'ASTRONAUT';
                saveHighScore({
                  name: trimmed,
                  score: summary.score,
                  survivalSeconds: summary.survivalSeconds,
                  kills: summary.kills,
                  levelReached: summary.level,
                });
              }
              audioSystem.playClick();
              onPlayAgain();
            }}
            className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-pixel text-xs sm:text-sm font-bold bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer hover:scale-[1.02] active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>MAIN LAGI</span>
          </button>

          <button
            onClick={() => {
              if (!isSaved) {
                const trimmed = nickname.trim() || 'ASTRONAUT';
                saveHighScore({
                  name: trimmed,
                  score: summary.score,
                  survivalSeconds: summary.survivalSeconds,
                  kills: summary.kills,
                  levelReached: summary.level,
                });
                setIsSaved(true);
              }
              audioSystem.playClick();
              onOpenLeaderboard();
            }}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-mono text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-600/40 hover:bg-amber-900/50 hover:border-amber-400 transition-all cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>LIHAT TOP 5 LEADERBOARD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
