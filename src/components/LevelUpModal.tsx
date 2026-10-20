/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { UpgradeOption } from '../game/rules.ts';
import { audioSystem } from '../game/audio.ts';
import { Zap, Crosshair, Shield, FastForward, Magnet, Heart, Flame, Sparkles } from 'lucide-react';

interface LevelUpModalProps {
  level: number;
  options: UpgradeOption[];
  onSelectUpgrade: (upgradeId: string) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  level,
  options,
  onSelectUpgrade,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '1' && options[0]) {
        onSelectUpgrade(options[0].id);
      } else if (e.key === '2' && options[1]) {
        onSelectUpgrade(options[1].id);
      } else if (e.key === '3' && options[2]) {
        onSelectUpgrade(options[2].id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [options, onSelectUpgrade]);

  const getUpgradeIcon = (iconName: string) => {
    switch (iconName) {
      case 'laser':
        return <Zap className="w-6 h-6 text-cyan-400" />;
      case 'orbital':
        return <Crosshair className="w-6 h-6 text-purple-400" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-blue-400" />;
      case 'speed':
        return <FastForward className="w-6 h-6 text-emerald-400" />;
      case 'magnet':
        return <Magnet className="w-6 h-6 text-amber-400" />;
      case 'health':
        return <Heart className="w-6 h-6 text-rose-400" />;
      case 'reactor':
        return <Flame className="w-6 h-6 text-yellow-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-cyan-400" />;
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="w-full max-w-xl flex flex-col items-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.35)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-500/50 rounded-full text-cyan-300 text-xs font-mono font-bold tracking-widest mb-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>LEVEL {level} REACHED!</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-pixel font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-sky-300 tracking-wider">
            PILIH 1 UPGRADE
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Tekan angka <span className="text-cyan-300 font-bold">[1]</span>, <span className="text-cyan-300 font-bold">[2]</span>, atau <span className="text-cyan-300 font-bold">[3]</span> untuk memilih cepat.
          </p>
        </div>

        {/* Upgrade Cards List */}
        <div className="w-full flex flex-col gap-3">
          {options.map((opt, idx) => (
            <button
              key={opt.id}
              onClick={() => {
                audioSystem.playClick();
                onSelectUpgrade(opt.id);
              }}
              className="group relative flex items-center gap-4 w-full p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border-2 border-slate-700/60 hover:border-cyan-400 transition-all shadow-md hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] text-left cursor-pointer transform hover:-translate-y-0.5"
            >
              {/* Shortcut digit badge */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 group-hover:border-cyan-400 flex items-center justify-center font-mono font-bold text-sm text-slate-300 group-hover:text-cyan-300">
                {idx + 1}
              </div>

              {/* Icon Container */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner"
                style={{
                  backgroundColor: `${opt.color}18`,
                  borderColor: `${opt.color}55`,
                }}
              >
                {getUpgradeIcon(opt.icon)}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                    {opt.name}
                  </h3>
                  <span
                    className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ml-2"
                    style={{
                      color: opt.color,
                      borderColor: `${opt.color}44`,
                      backgroundColor: `${opt.color}15`,
                    }}
                  >
                    {opt.category === 'weapon' ? 'SENJATA' : 'STAT'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-snug">
                  {opt.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
