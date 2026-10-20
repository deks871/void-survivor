/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Skull, Clock, Heart, Shield, Volume2, VolumeX, Pause, Zap, Crosshair } from 'lucide-react';
import { PlayerStats } from '../game/rules.ts';

interface HUDProps {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  level: number;
  xp: number;
  xpNeeded: number;
  survivalSeconds: number;
  kills: number;
  shieldOverload?: boolean;
  frenzyTimer?: number;
  regenBuffTimer?: number;
  stats: PlayerStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onTouchJoystick?: (x: number, y: number, active: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  hp,
  maxHp,
  shield,
  maxShield,
  level,
  xp,
  xpNeeded,
  survivalSeconds,
  kills,
  shieldOverload = false,
  frenzyTimer = 0,
  regenBuffTimer = 0,
  stats,
  isMuted,
  onToggleMute,
  onPause,
  onTouchJoystick,
}) => {
  // Format survival time MM:SS
  const mins = Math.floor(survivalSeconds / 60);
  const secs = survivalSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const xpPercent = Math.min(100, Math.max(0, (xp / (xpNeeded || 1)) * 100));
  const hpPercent = Math.min(100, Math.max(0, (hp / (maxHp || 1)) * 100));

  // Virtual Joystick state for mobile / touch screens
  const joystickRef = useRef<HTMLDivElement>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [showVirtualJoystick, setShowVirtualJoystick] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const checkViewportAndTouch = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileWidth = window.innerWidth <= 768;
      setShowVirtualJoystick(hasTouch || isMobileWidth);
    };
    checkViewportAndTouch();
    window.addEventListener('resize', checkViewportAndTouch);
    return () => window.removeEventListener('resize', checkViewportAndTouch);
  }, []);

  const updateJoystickFromClientXY = (clientX: number, clientY: number) => {
    const rect = joystickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 38;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setTouchPos({ x: knobX, y: knobY });
    if (onTouchJoystick) {
      onTouchJoystick(knobX / maxRadius, knobY / maxRadius, true);
    }
  };

  const resetJoystick = () => {
    isDraggingRef.current = false;
    setTouchPos(null);
    if (onTouchJoystick) {
      onTouchJoystick(0, 0, false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) updateJoystickFromClientXY(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) updateJoystickFromClientXY(touch.clientX, touch.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !isDraggingRef.current) return;
    updateJoystickFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    resetJoystick();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between select-none overflow-hidden">
      {/* Top Safe-Area HUD Container (top: 12px, left: 12px, right: 12px) */}
      <div className="w-full max-w-4xl mx-auto pt-[12px] px-[12px] flex flex-col gap-1.5 sm:gap-2">
        {/* Row 1: XP Bar + Right-Aligned Utility Buttons (Sound & Pause) */}
        <div className="w-full flex items-center gap-2">
          {/* Continuous XP Bar */}
          <div className="relative flex-1 min-w-0 h-5 sm:h-5 bg-slate-950/85 border border-cyan-500/40 rounded-full overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-150 ease-out"
              style={{ width: `${xpPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2.5 sm:px-3 text-[9px] sm:text-xs font-mono font-bold tracking-wider text-white">
              <span className="text-cyan-300 font-pixel text-[8px] sm:text-[10px] truncate">
                LV.{level}
              </span>
              <span className="tabular-nums opacity-95 text-[9px] sm:text-xs truncate ml-1">
                XP {xp}/{xpNeeded} ({Math.round(xpPercent)}%)
              </span>
            </div>
          </div>

          {/* Top-Right Utility Controls (Sound & Pause) with safe margin & touch target */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pointer-events-auto">
            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-slate-950/85 border border-slate-700/80 hover:border-cyan-400 text-slate-200 hover:text-white transition-all shadow-md cursor-pointer active:scale-95"
              aria-label={isMuted ? 'Aktifkan Suara' : 'Bisukan Suara'}
              title="Mute (M)"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-slate-950/85 border border-slate-700/80 hover:border-amber-400 text-slate-200 hover:text-white transition-all shadow-md cursor-pointer active:scale-95"
              aria-label="Pause Game"
              title="Pause (Esc / P)"
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Row 2: Dynamic Flex Container for HP Bar, Shield, Timer, and Kill Count */}
        <div className="w-full flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Player Vitality & Shield */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/80 border border-slate-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-md min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Heart
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                  hp < maxHp * 0.3 ? 'text-red-500 animate-pulse' : 'text-emerald-400'
                }`}
              />
              <div className="w-14 xs:w-18 sm:w-28 h-2 sm:h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-200 ${
                    hp < maxHp * 0.3 ? 'bg-red-500' : hp < maxHp * 0.6 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-200 tabular-nums">
                {hp}/{maxHp}
              </span>
            </div>

            {stats.shieldLevel > 0 && (
              <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5 sm:pl-2">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-mono font-bold text-sky-300 tabular-nums">
                  {shield}/{maxShield}
                </span>
              </div>
            )}
          </div>

          {/* Right/Center: Survival Timer & Kills */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/80 border border-slate-800 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-md">
            <div className="flex items-center gap-1 text-cyan-300">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[11px] sm:text-sm font-mono font-bold tabular-nums tracking-wider">
                {timeFormatted}
              </span>
            </div>

            <span className="text-slate-700 text-xs">|</span>

            <div className="flex items-center gap-1 text-rose-400">
              <Skull className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-[11px] sm:text-sm font-mono font-bold tabular-nums">{kills}</span>
            </div>
          </div>
        </div>

        {/* Row 3: Active Power-Up Buff Indicators (if any active) */}
        {(shieldOverload || frenzyTimer > 0 || regenBuffTimer > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {shieldOverload && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/85 border border-sky-400/60 text-[10px] font-mono font-bold text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.35)]">
                <Shield className="w-3 h-3 text-sky-400" />
                <span>SHIELD UP</span>
              </div>
            )}
            {frenzyTimer > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-950/85 border border-yellow-400/60 text-[10px] font-mono font-bold text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.35)] tabular-nums">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span>FRENZY {frenzyTimer}s</span>
              </div>
            )}
            {regenBuffTimer > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/85 border border-emerald-400/60 text-[10px] font-mono font-bold text-emerald-300 shadow-[0_0_10px_rgba(74,222,128,0.35)] tabular-nums">
                <Heart className="w-3 h-3 text-emerald-400" />
                <span>+HP REGEN {regenBuffTimer}s</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Virtual Joystick (Elevated at bottom: 85px, left: 25px for smartphone navigation bar safety) */}
      {showVirtualJoystick && (
        <div
          ref={joystickRef}
          data-testid="virtual-joystick"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={resetJoystick}
          onTouchCancel={resetJoystick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetJoystick}
          style={{ bottom: '85px', left: '25px' }}
          className="fixed w-24 h-24 rounded-full bg-slate-900/55 border-2 border-cyan-400/45 flex items-center justify-center touch-none pointer-events-auto shadow-[0_0_20px_rgba(6,182,212,0.25)] z-30"
          aria-label="Touch Control Joystick"
        >
          {/* Inner crosshair guide */}
          <div className="absolute w-12 h-12 rounded-full border border-cyan-500/20 pointer-events-none" />
          {/* Analog thumb knob */}
          <div
            className="w-10 h-10 rounded-full bg-cyan-400/85 border-2 border-white shadow-[0_0_12px_rgba(34,211,238,0.8)] pointer-events-none"
            style={{
              transform: touchPos ? `translate(${touchPos.x}px, ${touchPos.y}px)` : 'translate(0px, 0px)',
              transition: touchPos ? 'none' : 'transform 0.15s ease-out',
            }}
          />
        </div>
      )}

      {/* Bottom-Right Active Weapons Loadout Bar */}
      <div className="w-full max-w-4xl mx-auto px-3 pb-3 flex items-end justify-end">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/75 border border-slate-800 p-1 sm:p-1.5 rounded-lg">
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-cyan-950/50 border border-cyan-800 text-[10px] sm:text-[11px] font-mono text-cyan-300">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Laser L{stats.laserLevel}</span>
          </div>

          {stats.orbitalLevel > 0 && (
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-purple-950/50 border border-purple-800 text-[10px] sm:text-[11px] font-mono text-purple-300">
              <Crosshair className="w-3 h-3 text-purple-400" />
              <span>Plasma L{stats.orbitalLevel}</span>
            </div>
          )}

          {stats.shieldLevel > 0 && (
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-blue-950/50 border border-blue-800 text-[10px] sm:text-[11px] font-mono text-blue-300">
              <Shield className="w-3 h-3 text-blue-400" />
              <span>Shield L{stats.shieldLevel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
