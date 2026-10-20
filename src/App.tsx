/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VoidSurvivorEngine } from './game/engine.ts';
import { INITIAL_PLAYER_STATS, PlayerStats, generateUpgradeOptions, UpgradeOption } from './game/rules.ts';
import { audioSystem } from './game/audio.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { HUD } from './components/HUD.tsx';
import { LevelUpModal } from './components/LevelUpModal.tsx';
import { PauseModal } from './components/PauseModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VoidSurvivorEngine | null>(null);

  // High-level App State
  const [gameState, setGameState] = useState<GameState>('title');
  const [isMuted, setIsMuted] = useState<boolean>(audioSystem.getMuted());
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Level Up options state
  const [levelUpOptions, setLevelUpOptions] = useState<UpgradeOption[]>([]);
  const [pendingLevel, setPendingLevel] = useState<number>(1);

  // HUD stats state
  const [hudStats, setHudStats] = useState({
    hp: 100,
    maxHp: 100,
    shield: 0,
    maxShield: 0,
    level: 1,
    xp: 0,
    xpNeeded: 10,
    survivalSeconds: 0,
    kills: 0,
    shieldOverload: false,
    frenzyTimer: 0,
    regenBuffTimer: 0,
  });

  // Game over run summary
  const [runSummary, setRunSummary] = useState({
    survivalSeconds: 0,
    kills: 0,
    level: 1,
    score: 0,
    gemsCollected: 0,
  });

  // Player stats reference for upgrades
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ ...INITIAL_PLAYER_STATS });

  // Sync document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Audio mute toggle helper
  const handleToggleMute = useCallback(() => {
    const muted = audioSystem.toggleMute();
    setIsMuted(muted);
  }, []);

  // Start game handler
  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    engineRef.current.start();
    setGameState('playing');
    setPlayerStats({ ...INITIAL_PLAYER_STATS });
  }, []);

  // Pause game handler
  const handlePause = useCallback(() => {
    if (gameState !== 'playing' || !engineRef.current) return;
    engineRef.current.pause();
    setGameState('paused');
  }, [gameState]);

  // Resume game handler
  const handleResume = useCallback(() => {
    if (gameState !== 'paused' || !engineRef.current) return;
    engineRef.current.resume();
    setGameState('playing');
  }, [gameState]);

  // Restart game handler
  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.reset();
    engineRef.current.start();
    setGameState('playing');
    setPlayerStats({ ...INITIAL_PLAYER_STATS });
  }, []);

  // Back to title handler
  const handleBackToTitle = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
    setGameState('title');
  }, []);

  // Apply Upgrade from Level Up Modal
  const handleSelectUpgrade = useCallback((upgradeId: string) => {
    if (!engineRef.current) return;
    engineRef.current.applyUpgrade(upgradeId);
    setLevelUpOptions([]);
    // Resume game
    engineRef.current.resume();
    setGameState('playing');
  }, []);

  // Touch joystick callback
  const handleTouchJoystick = useCallback((x: number, y: number, active: boolean) => {
    if (engineRef.current) {
      engineRef.current.setTouchJoystick(x, y, active);
    }
  }, []);

  // Initialize Canvas & Engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle canvas resizing
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Callbacks for engine
    const engine = new VoidSurvivorEngine(canvas, {
      onLevelUp: (newLevel, currentStats) => {
        setPendingLevel(newLevel);
        const options = generateUpgradeOptions(currentStats);
        setLevelUpOptions(options);
        setGameState('paused'); // pauses simulation
      },
      onGameOver: (summary) => {
        setRunSummary(summary);
        setGameState('gameover');
      },
      onStatsChange: (stats) => {
        setHudStats(stats);
        if (engineRef.current) {
          setPlayerStats(engineRef.current.stats);
        }
      },
    });

    engineRef.current = engine;

    // Check ?autostart=1 query param
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autostart') === '1') {
      engine.start();
      setGameState('playing');
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      engine.destroy();
    };
  }, []);

  // Global key bindings for Pause (Escape/P)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          handlePause();
        } else if (gameState === 'paused' && levelUpOptions.length === 0) {
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameState, levelUpOptions.length, handlePause, handleResume]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05060b] select-none">
      {/* 1. Isolated Canvas mount */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 block w-full h-full cursor-crosshair z-0"
      />

      {/* 2. Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 3. In-Game HUD (Visible during playing & paused) */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          hp={hudStats.hp}
          maxHp={hudStats.maxHp}
          shield={hudStats.shield}
          maxShield={hudStats.maxShield}
          level={hudStats.level}
          xp={hudStats.xp}
          xpNeeded={hudStats.xpNeeded}
          survivalSeconds={hudStats.survivalSeconds}
          kills={hudStats.kills}
          shieldOverload={hudStats.shieldOverload}
          frenzyTimer={hudStats.frenzyTimer}
          regenBuffTimer={hudStats.regenBuffTimer}
          stats={playerStats}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onTouchJoystick={handleTouchJoystick}
        />
      )}

      {/* 4. Level Up Modal (Takes precedence when levelUpOptions is populated) */}
      {levelUpOptions.length > 0 && (
        <LevelUpModal
          level={pendingLevel}
          options={levelUpOptions}
          onSelectUpgrade={handleSelectUpgrade}
        />
      )}

      {/* 5. Pause Modal */}
      {gameState === 'paused' && levelUpOptions.length === 0 && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onTitle={handleBackToTitle}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 6. Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          summary={runSummary}
          onPlayAgain={handleStartGame}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {/* 7. Offline Local Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}
    </div>
  );
}
