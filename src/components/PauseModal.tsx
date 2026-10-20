/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { audioSystem } from '../game/audio.ts';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onTitle,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        audioSystem.playClick();
        onResume();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        audioSystem.playClick();
        onRestart();
      } else if (e.code === 'KeyM') {
        onToggleMute();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onResume, onRestart, onToggleMute]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div className="w-full max-w-sm flex flex-col items-center bg-slate-950 border border-slate-700 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <h2 className="text-xl font-pixel text-amber-400 mb-6 tracking-wider">
          GAME PAUSED
        </h2>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => {
              audioSystem.playClick();
              onResume();
            }}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-mono font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>LANJUTKAN (ESC)</span>
          </button>

          <button
            onClick={() => {
              audioSystem.playClick();
              onRestart();
            }}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-mono font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ULANGI DARI AWAL (R)</span>
          </button>

          <button
            onClick={() => {
              audioSystem.playClick();
              onTitle();
            }}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-mono font-bold text-sm bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>KEMBALI KE MENU</span>
          </button>

          <button
            onClick={onToggleMute}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-mono text-xs text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all mt-2 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'SUARA: NONAKTIF (M)' : 'SUARA: AKTIF (M)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
