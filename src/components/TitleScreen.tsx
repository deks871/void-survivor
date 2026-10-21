/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Play, Trophy, Volume2, VolumeX, Shield, Zap, Sparkles, User } from 'lucide-react';
import { audioSystem } from '../game/audio.ts';
import { PWAInstallButton, OfflineIndicator } from './PWAInstallButton.tsx';

interface TitleScreenProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onStart: () => void;
  onOpenLeaderboard: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  playerName,
  onPlayerNameChange,
  onStart,
  onOpenLeaderboard,
  isMuted,
  onToggleMute,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const startSectionRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement === inputRef.current ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if (isInputFocused) {
        // Inside input: allow normal typing (Space, M, etc.). Form submit handles Enter.
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        audioSystem.playClick();
        onStart();
      } else if (e.code === 'KeyM') {
        onToggleMute();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart, onToggleMute]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.blur();
    }
    audioSystem.playClick();
    onStart();
  };

  const handleInputFocus = () => {
    // Ensure the input box and Mulai Game button right below it stay comfortably visible above mobile keyboard
    setTimeout(() => {
      startSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between items-center px-4 py-3 sm:p-6 bg-gradient-to-b from-[#05060f]/90 via-[#090b1c]/85 to-[#04050a]/95 pointer-events-auto overflow-y-auto">
      {/* Top utility row */}
      <div className="w-full max-w-4xl flex justify-between items-center pt-1 sm:pt-2 shrink-0 gap-2">
        <div className="flex items-center">
          <OfflineIndicator />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              audioSystem.playClick();
              onOpenLeaderboard();
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/50 hover:border-amber-400 transition-all rounded shadow-[0_0_12px_rgba(245,158,11,0.2)] whitespace-nowrap cursor-pointer"
            aria-label="Buka Leaderboard Lokal"
          >
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span>TOP 5 SKOR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleMute();
            }}
            className="p-2 text-slate-300 bg-slate-900/60 border border-slate-700/60 hover:text-white hover:border-slate-500 transition-all rounded cursor-pointer"
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            title="Toggle Mute (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Hero centerpiece & SVG title lockup */}
      <div className="flex flex-col items-center text-center w-full max-w-2xl my-auto py-2">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="relative mb-3 sm:mb-5">
          <svg
            viewBox="0 0 520 120"
            className="w-[260px] sm:w-[430px] md:w-[500px] h-auto drop-shadow-[0_0_25px_rgba(6,182,212,0.45)]"
          >
            <defs>
              <linearGradient id="neonCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="neonPinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Background cyber wings */}
            <path d="M 60 70 L 10 50 L 70 30 Z" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="1.5" />
            <path d="M 460 70 L 510 50 L 450 30 Z" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="1.5" />

            {/* Decorative orbit ring */}
            <ellipse
              cx="260"
              cy="55"
              rx="210"
              ry="24"
              fill="none"
              stroke="rgba(168, 85, 247, 0.35)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />

            {/* VOID Text */}
            <text
              x="260"
              y="52"
              textAnchor="middle"
              className="font-pixel"
              fontSize="38"
              fontWeight="900"
              fill="url(#neonCyanGrad)"
              stroke="#083344"
              strokeWidth="2"
              letterSpacing="6"
            >
              VOID
            </text>

            {/* SURVIVOR Text */}
            <text
              x="260"
              y="94"
              textAnchor="middle"
              className="font-pixel"
              fontSize="24"
              fontWeight="900"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="1.5"
              letterSpacing="8"
            >
              SURVIVOR
            </text>
          </svg>
        </div>

        {/* Subtitle tag */}
        <p className="text-xs sm:text-sm md:text-base text-cyan-200/90 font-mono tracking-wider mb-4 sm:mb-6 max-w-lg px-2">
          Bertahanlah dari kepungan kawanan alien di planet tak berujung. Senjata otomatis, raup Energy Gems, dan racik upgrade terkuat.
        </p>

        {/* Nickname Astronaut Input + Mulai Game CTA Form */}
        <form
          ref={startSectionRef}
          onSubmit={handleFormSubmit}
          className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-3 px-2"
        >
          <div className="w-full flex flex-col items-center">
            <label
              htmlFor="astronaut-nickname-input"
              className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-pixel text-cyan-300 tracking-wider uppercase mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>NICKNAME ASTRONAUT</span>
            </label>

            <div className="relative w-full group">
              <input
                id="astronaut-nickname-input"
                ref={inputRef}
                type="text"
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value.slice(0, 16))}
                onFocus={handleInputFocus}
                placeholder="Astronaut"
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-label="Nickname Astronaut"
                className="w-full px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-pixel tracking-wider text-cyan-100 placeholder:text-cyan-500/45 bg-[#060919]/90 border-2 border-cyan-400/70 focus:border-fuchsia-400 rounded-lg outline-none shadow-[0_0_18px_rgba(6,182,212,0.35),inset_0_0_12px_rgba(6,182,212,0.15)] focus:shadow-[0_0_25px_rgba(232,121,249,0.55),inset_0_0_14px_rgba(6,182,212,0.25)] transition-all"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400/90 mt-1">
              Kosongkan untuk default: <strong className="text-cyan-300/90">Astronaut</strong>
            </span>
          </div>

          {/* Primary Start CTA Button */}
          <button
            type="submit"
            data-start="true"
            className="w-full group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 text-sm sm:text-base font-pixel tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 hover:from-cyan-300 hover:to-sky-200 transition-all rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_45px_rgba(6,182,212,0.85)] hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current text-slate-950 transition-transform group-hover:translate-x-0.5" />
            <span>MULAI GAME</span>
          </button>

          <PWAInstallButton variant="menu" />
        </form>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-7 w-full max-w-md text-[11px] sm:text-xs font-mono text-slate-400">
          <div className="flex flex-col items-center p-2 rounded bg-slate-900/40 border border-slate-800">
            <Zap className="w-4 h-4 text-cyan-400 mb-1" />
            <span>Auto-Attack</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded bg-slate-900/40 border border-slate-800">
            <Sparkles className="w-4 h-4 text-purple-400 mb-1" />
            <span>Vacuum Gems</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded bg-slate-900/40 border border-slate-800">
            <Shield className="w-4 h-4 text-blue-400 mb-1" />
            <span>Rogue Upgrades</span>
          </div>
        </div>
      </div>

      {/* Flat control-hint line */}
      <div className="w-full text-center pb-1 sm:pb-2 shrink-0">
        <p className="text-[10px] sm:text-xs font-mono text-slate-400 tracking-wide">
          WASD / Panah Gerak · Auto-Attack · Space / Enter Mulai · Esc / P Pause · M Audio
        </p>
      </div>
    </div>
  );
};
