/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share, X, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../game/usePWAInstall.ts';
import { audioSystem } from '../game/audio.ts';

interface PWAInstallButtonProps {
  variant?: 'header' | 'menu';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const buttonClasses =
    variant === 'menu'
      ? 'w-full mt-2.5 py-2.5 px-4 flex items-center justify-center gap-2 text-xs font-pixel tracking-wider text-cyan-200 bg-cyan-950/60 border border-cyan-400/60 hover:bg-cyan-900/70 hover:border-cyan-300 active:scale-[0.99] transition-all rounded-lg shadow-[0_0_16px_rgba(6,182,212,0.28)] cursor-pointer'
      : 'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono font-bold text-cyan-200 bg-cyan-950/50 border border-cyan-400/50 hover:bg-cyan-900/60 hover:border-cyan-300 transition-all rounded shadow-[0_0_12px_rgba(6,182,212,0.25)] whitespace-nowrap cursor-pointer';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          audioSystem.playClick();
          void install();
        }}
        className={buttonClasses}
        aria-label="Instal Game Void Survivor"
      >
        <span>📲 INSTAL GAME</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            audioSystem.playClick();
            setShowIOSGuide(true);
          }}
          className={buttonClasses}
          aria-label="Panduan Instal Game di iOS"
        >
          <span>📲 INSTAL GAME</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-[#070a18] border border-cyan-500/50 p-5 shadow-[0_0_30px_rgba(6,182,212,0.3)] text-left font-mono">
              <div className="flex items-center justify-between mb-3">
                <h3 id="ios-install-title" className="text-xs font-pixel text-cyan-300 tracking-wider">
                  📲 INSTAL GAME
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  aria-label="Tutup panduan install"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Pasang game ini di layar utama iPhone / iPad untuk mode layar penuh &amp; bermain 100% offline:
              </p>
              <ol className="text-xs text-cyan-100 space-y-2 mb-4 list-decimal list-inside">
                <li className="flex items-center gap-1.5">
                  <span>1. Ketuk tombol</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                    <Share className="w-3 h-3" /> Share
                  </span>
                  <span>di Safari.</span>
                </li>
                <li>2. Pilih <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 text-xs font-pixel text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors cursor-pointer"
              >
                MENGERTI
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded bg-amber-950/80 border border-amber-500/50 px-2.5 py-1.5 text-[10px] font-mono font-bold text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] whitespace-nowrap pointer-events-none"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>OFFLINE</span>
    </div>
  );
};
