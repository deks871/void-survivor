/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlayerStats,
  INITIAL_PLAYER_STATS,
  calculateXpNeeded,
  checkCircleCollision,
  getDistance,
  getWaveDifficulty,
  calculateScore,
  PowerUpType,
  POWER_UP_CONFIGS,
  rollPowerUpDrop,
} from './rules.ts';
import { audioSystem } from './audio.ts';

// Particle definition for zero-GC pooling
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'spark' | 'ring';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  scale: number;
}

export type EnemyType = 'crawler' | 'spitter' | 'goliath' | 'elite';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxHp: number;
  hp: number;
  speed: number;
  damage: number;
  color: string;
  glowColor: string;
  hitFlashTimer: number; // 0 to 0.1s
  // Specific AI state
  stateTimer: number;
  chargeCooldown: number;
  isTelegraphing: boolean;
  telegraphTimer: number;
  chargeDirection: { x: number; y: number };
  shootCooldown: number;
  // KO dissolve
  isDying: boolean;
  deathTimer: number;
  deathDuration: number;
}

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  damage: number;
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  xpValue: number;
  color: string;
  radius: number;
  isBeingVacuumed: boolean;
  speed: number;
  bobOffset: number;
}

export interface PowerUpCapsule {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  radius: number;
  bobOffset: number;
  life: number;
  maxLife: number;
}

export interface LaserBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
}

export interface EngineCallbacks {
  onLevelUp: (newLevel: number, stats: PlayerStats) => void;
  onGameOver: (summary: {
    survivalSeconds: number;
    kills: number;
    level: number;
    score: number;
    gemsCollected: number;
  }) => void;
  onStatsChange: (info: {
    hp: number;
    maxHp: number;
    shield: number;
    maxShield: number;
    level: number;
    xp: number;
    xpNeeded: number;
    survivalSeconds: number;
    kills: number;
    shieldOverload: boolean;
    frenzyTimer: number;
    regenBuffTimer: number;
  }) => void;
}

export class VoidSurvivorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  // Running & Timing
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private survivalSeconds: number = 0;
  private hitstopTimer: number = 0;

  // Player state
  public stats: PlayerStats = { ...INITIAL_PLAYER_STATS };
  public playerX: number = 0;
  public playerY: number = 0;
  public playerVx: number = 0;
  public playerVy: number = 0;
  public playerFacingAngle: number = 0;
  public playerLevel: number = 1;
  public playerXp: number = 0;
  public playerXpNeeded: number = 10;
  public currentShield: number = 0;
  private shieldRechargeTimer: number = 0;
  private regenTimer: number = 0;
  private playerHurtFlashTimer: number = 0;

  // Active Power-Up Buff states
  public naniteRegenTimer: number = 0; // seconds remaining of +1 HP/s buff
  private naniteTickAccumulator: number = 0;
  public shieldOverloadActive: boolean = false; // blocks 1 hit completely
  public weaponOverdriveTimer: number = 0; // seconds remaining of +1 projectile & +50% fire rate

  // Input states
  private keysHeld = new Set<string>();
  private touchVector = { x: 0, y: 0, active: false };

  // Camera & Screen Shake
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraShake: number = 0;

  // Entities
  private enemies: Enemy[] = [];
  private enemyBullets: EnemyBullet[] = [];
  private gems: Gem[] = [];
  private powerUps: PowerUpCapsule[] = [];
  private laserBeams: LaserBeam[] = [];
  private floatingTexts: FloatingText[] = [];
  private particles: Particle[] = [];
  private nextEntityId: number = 1;

  // Stats Counters
  private kills: number = 0;
  private gemsCollected: number = 0;

  // Weapon timers & angles
  private laserFireTimer: number = 0;
  private orbitalAngle: number = 0;
  private spawnTimer: number = 0;

  // Background stars
  private bgStars: Array<{ x: number; y: number; size: number; speed: number; alpha: number }> = [];

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.callbacks = callbacks;

    this.initParticlePool(350);
    this.initStars();
    this.bindInputs();
  }

  private initParticlePool(count: number) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2,
        color: '#fff',
        alpha: 1,
        decay: 1,
        shape: 'circle',
      });
    }
  }

  private initStars() {
    this.bgStars = [];
    for (let i = 0; i < 150; i++) {
      this.bgStars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        size: Math.random() < 0.2 ? 2.5 : Math.random() < 0.6 ? 1.5 : 1,
        speed: 0.1 + Math.random() * 0.4,
        alpha: 0.3 + Math.random() * 0.7,
      });
    }
  }

  private bindInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
  };

  private handleBlur = () => {
    this.keysHeld.clear();
    this.touchVector = { x: 0, y: 0, active: false };
  };

  public setTouchJoystick(x: number, y: number, active: boolean) {
    this.touchVector = { x, y, active };
  }

  public start() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public resume() {
    if (!this.isRunning || this.isGameOver) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public pause() {
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset() {
    this.stats = { ...INITIAL_PLAYER_STATS };
    this.playerX = 0;
    this.playerY = 0;
    this.playerVx = 0;
    this.playerVy = 0;
    this.playerFacingAngle = 0;
    this.playerLevel = 1;
    this.playerXp = 0;
    this.playerXpNeeded = calculateXpNeeded(1);
    this.currentShield = 0;
    this.shieldRechargeTimer = 0;
    this.regenTimer = 0;
    this.naniteRegenTimer = 0;
    this.naniteTickAccumulator = 0;
    this.shieldOverloadActive = false;
    this.weaponOverdriveTimer = 0;
    this.survivalSeconds = 0;
    this.kills = 0;
    this.gemsCollected = 0;
    this.cameraShake = 0;
    this.hitstopTimer = 0;
    this.cameraX = 0;
    this.cameraY = 0;

    this.enemies = [];
    this.enemyBullets = [];
    this.gems = [];
    this.powerUps = [];
    this.laserBeams = [];
    this.floatingTexts = [];
    this.laserFireTimer = 0;
    this.orbitalAngle = 0;
    this.spawnTimer = 0;

    for (const p of this.particles) p.active = false;

    // Expose test hooks for automation/headless verification
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        __grantTestXp?: (amount: number) => void;
        __damagePlayer?: (amount: number) => void;
        __spawnPowerUp?: (type: PowerUpType, offsetX?: number, offsetY?: number) => void;
      };
      win.__grantTestXp = (amount: number) => {
        this.playerXp += amount;
        if (this.playerXp >= this.playerXpNeeded) {
          this.triggerLevelUp();
        }
      };
      win.__damagePlayer = (amount: number) => {
        this.damagePlayer(amount);
      };
      win.__spawnPowerUp = (type: PowerUpType, offsetX: number = 0, offsetY: number = 0) => {
        this.spawnPowerUpCapsule(type, this.playerX + offsetX, this.playerY + offsetY);
      };
    }
  }

  public applyUpgrade(upgradeId: string) {
    const wasShieldLevel = this.stats.shieldLevel;

    import('./rules.ts').then(({ applyUpgrade }) => {
      this.stats = applyUpgrade(this.stats, upgradeId);
      if (this.stats.shieldLevel > wasShieldLevel) {
        this.currentShield = this.stats.shieldMax;
      }
      this.notifyStats();
    });
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(rawDt, 0.05);

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Hitstop handling: freeze simulation physics while decaying hit flashes & screen shake
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 25);
      return;
    }

    this.survivalSeconds += dt;

    // 1. Player movement
    let moveX = 0;
    let moveY = 0;

    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveY -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveY += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;

    // Touch joystick overlay override
    if (this.touchVector.active) {
      moveX = this.touchVector.x;
      moveY = this.touchVector.y;
    }

    const moveMag = Math.hypot(moveX, moveY);
    if (moveMag > 0.05) {
      const normX = moveX / moveMag;
      const normY = moveY / moveMag;
      this.playerX += normX * this.stats.moveSpeed * dt;
      this.playerY += normY * this.stats.moveSpeed * dt;
      this.playerFacingAngle = Math.atan2(normY, normX);

      // Jetpack thrust particles
      if (Math.random() < 0.4) {
        this.spawnParticle(
          this.playerX - normX * 16 + (Math.random() - 0.5) * 6,
          this.playerY - normY * 16 + (Math.random() - 0.5) * 6,
          -normX * (30 + Math.random() * 40),
          -normY * (30 + Math.random() * 40),
          2.5,
          Math.random() < 0.5 ? '#06b6d4' : '#38bdf8',
          0.8,
          3.5
        );
      }
    }

    // Camera follow player with slight smooth damping
    const targetCamX = this.playerX;
    const targetCamY = this.playerY;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 10);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 10);

    // Camera shake decay
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 25);
    }

    // Passive Player HP Regen from upgrades
    if (this.stats.hpRegenPerSec > 0 && this.stats.hp < this.stats.maxHp) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1.0) {
        this.regenTimer = 0;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + this.stats.hpRegenPerSec);
      }
    }

    // Temporary Nanite Heart Regen Buff (+1 HP/sec for 8 seconds)
    if (this.naniteRegenTimer > 0) {
      this.naniteRegenTimer = Math.max(0, this.naniteRegenTimer - dt);
      this.naniteTickAccumulator += dt;
      if (this.naniteTickAccumulator >= 1.0) {
        this.naniteTickAccumulator -= 1.0;
        if (this.stats.hp < this.stats.maxHp) {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 1);
          this.floatingTexts.push({
            id: this.nextEntityId++,
            x: this.playerX + (Math.random() - 0.5) * 14,
            y: this.playerY - 22,
            text: '+1 HP',
            color: '#4ade80',
            life: 0.55,
            maxLife: 0.55,
            vy: -35,
            scale: 0.95,
          });
        }
        // Healing aura particle
        this.spawnParticle(
          this.playerX + (Math.random() - 0.5) * 20,
          this.playerY + (Math.random() - 0.5) * 16,
          0,
          -35,
          2.5,
          '#4ade80',
          0.9,
          2.5
        );
      }
    }

    // Temporary Weapon Overdrive Buff Timer
    if (this.weaponOverdriveTimer > 0) {
      this.weaponOverdriveTimer = Math.max(0, this.weaponOverdriveTimer - dt);
    }

    // Shield Recharge (Passive Upgrade Shield)
    if (this.stats.shieldLevel > 0 && this.currentShield < this.stats.shieldMax) {
      this.shieldRechargeTimer += dt;
      if (this.shieldRechargeTimer >= this.stats.shieldRechargeTime) {
        this.shieldRechargeTimer = 0;
        this.currentShield = this.stats.shieldMax;
        audioSystem.playShieldHit();
        this.spawnShockwave(this.playerX, this.playerY, 50, '#38bdf8');
      }
    }

    if (this.playerHurtFlashTimer > 0) {
      this.playerHurtFlashTimer = Math.max(0, this.playerHurtFlashTimer - dt);
    }

    // 2. Weapons: Aero Laser Auto-Attack (with Weapon Overdrive +50% Fire Rate support)
    this.laserFireTimer += dt;
    const effectiveCooldown =
      this.weaponOverdriveTimer > 0 ? this.stats.laserCooldown / 1.5 : this.stats.laserCooldown;
    if (this.laserFireTimer >= effectiveCooldown) {
      this.laserFireTimer = 0;
      this.fireAeroLaser();
    }

    // 3. Weapons: Orbital Plasma rotation & collisions
    if (this.stats.orbitalCount > 0) {
      this.orbitalAngle += this.stats.orbitalSpeed * dt;
      this.updateOrbitalPlasma(dt);
    }

    // 4. Enemy Spawning & Wave Difficulty Ramp
    const diff = getWaveDifficulty(this.survivalSeconds);
    this.spawnTimer += dt;
    if (this.spawnTimer >= diff.spawnInterval && this.enemies.length < diff.maxActiveEnemies) {
      this.spawnTimer = 0;
      for (let i = 0; i < diff.spawnCount; i++) {
        this.spawnEnemy(diff);
      }
    }

    // 5. Update Enemies
    this.updateEnemies(dt, diff);

    // 6. Update Enemy Bullets
    this.updateEnemyBullets(dt);

    // 7. Update Energy Gems & Magnet Vacuum
    this.updateGems(dt);

    // 8. Update Power-Up Capsules
    this.updatePowerUps(dt);

    // 9. Update Laser visual beams
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      beam.life -= dt;
      if (beam.life <= 0) {
        this.laserBeams.splice(i, 1);
      }
    }

    // 10. Update Floating Damage & Buff Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 11. Update Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        p.active = false;
      }
    }

    // Periodically notify React HUD
    this.notifyStats();
  }

  private fireAeroLaser() {
    // Find closest enemies within 600px
    const maxRange = 600;
    const candidates = this.enemies
      .filter((e) => !e.isDying)
      .map((e) => ({
        enemy: e,
        dist: getDistance(this.playerX, this.playerY, e.x, e.y),
      }))
      .filter((item) => item.dist <= maxRange)
      .sort((a, b) => a.dist - b.dist);

    if (candidates.length === 0) return;

    audioSystem.playLaser();
    const isOverdrive = this.weaponOverdriveTimer > 0;
    const totalProjectiles = this.stats.laserProjectiles + (isOverdrive ? 1 : 0);
    const count = Math.min(totalProjectiles, candidates.length);
    const beamColor = isOverdrive ? '#facc15' : '#22d3ee';

    for (let i = 0; i < count; i++) {
      const target = candidates[i].enemy;
      const damage = Math.round(this.stats.laserDamage * this.stats.damageMultiplier);

      // Deal damage
      this.damageEnemy(target, damage);

      // Beam graphic
      this.laserBeams.push({
        x1: this.playerX,
        y1: this.playerY,
        x2: target.x,
        y2: target.y,
        life: 0.12,
        maxLife: 0.12,
        color: beamColor,
        width: isOverdrive ? 4.2 : 3.5,
      });

      // Muzzle & impact sparks
      for (let s = 0; s < 4; s++) {
        this.spawnParticle(
          target.x + (Math.random() - 0.5) * 10,
          target.y + (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 120,
          (Math.random() - 0.5) * 120,
          2.5,
          isOverdrive ? '#fef08a' : '#a5f3fc',
          1,
          5
        );
      }

      // Pierce handling if laserPierce > 1: chain to another nearby enemy
      if (this.stats.laserPierce > 1 && candidates.length > count) {
        const secondary = candidates[count % candidates.length].enemy;
        this.damageEnemy(secondary, Math.round(damage * 0.7));
        this.laserBeams.push({
          x1: target.x,
          y1: target.y,
          x2: secondary.x,
          y2: secondary.y,
          life: 0.1,
          maxLife: 0.1,
          color: '#38bdf8',
          width: 2.5,
        });
      }
    }

    // If Overdrive is active and there was only 1 candidate, fire the extra overdrive laser in a secondary direction/hit
    if (isOverdrive && candidates.length === 1 && totalProjectiles > 1) {
      const primary = candidates[0].enemy;
      const angleToPrimary = Math.atan2(primary.y - this.playerY, primary.x - this.playerX);
      const spreadAngle = angleToPrimary + 0.35;
      const beamLen = 280;
      this.laserBeams.push({
        x1: this.playerX,
        y1: this.playerY,
        x2: this.playerX + Math.cos(spreadAngle) * beamLen,
        y2: this.playerY + Math.sin(spreadAngle) * beamLen,
        life: 0.12,
        maxLife: 0.12,
        color: '#facc15',
        width: 3.2,
      });
    }
  }

  private updateOrbitalPlasma(dt: number) {
    const count = this.stats.orbitalCount;
    const radius = this.stats.orbitalRadius;
    const damage = Math.round(this.stats.orbitalDamage * this.stats.damageMultiplier * dt * 3.5);

    for (let i = 0; i < count; i++) {
      const angle = this.orbitalAngle + (i * (2 * Math.PI)) / count;
      const orbX = this.playerX + Math.cos(angle) * radius;
      const orbY = this.playerY + Math.sin(angle) * radius;
      const orbRadius = 14;

      // Check collision with enemies
      for (const enemy of this.enemies) {
        if (enemy.isDying) continue;
        if (checkCircleCollision(orbX, orbY, orbRadius, enemy.x, enemy.y, enemy.radius)) {
          // Contact damage & pushback
          this.damageEnemy(enemy, Math.max(1, damage));
          const pushAngle = Math.atan2(enemy.y - orbY, enemy.x - orbX);
          enemy.x += Math.cos(pushAngle) * 25 * dt;
          enemy.y += Math.sin(pushAngle) * 25 * dt;

          if (Math.random() < 0.3) {
            this.spawnParticle(orbX, orbY, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 2, '#c084fc', 0.8, 4);
          }
        }
      }
    }
  }

  private spawnEnemy(diff: ReturnType<typeof getWaveDifficulty>) {
    // Spawn just outside viewport
    const viewW = this.canvas.width / 2 + 100;
    const viewH = this.canvas.height / 2 + 100;
    const spawnDist = Math.max(viewW, viewH);
    const angle = Math.random() * Math.PI * 2;
    const spawnX = this.playerX + Math.cos(angle) * spawnDist;
    const spawnY = this.playerY + Math.sin(angle) * spawnDist;

    // Determine type
    const roll = Math.random();
    let type: EnemyType = 'crawler';
    if (diff.allowElite && roll < 0.05) {
      type = 'elite';
    } else if (diff.allowGoliath && roll < 0.22) {
      type = 'goliath';
    } else if (diff.allowSpitter && roll < 0.45) {
      type = 'spitter';
    }

    let radius = 12;
    let baseHp = 30;
    let speed = 90;
    let damage = 10;
    let color = '#84cc16'; // Neon lime
    let glowColor = '#a3e635';

    if (type === 'spitter') {
      radius = 15;
      baseHp = 45;
      speed = 70;
      damage = 12;
      color = '#e879f9'; // Pink/Purple
      glowColor = '#f0abfc';
    } else if (type === 'goliath') {
      radius = 24;
      baseHp = 130;
      speed = 52;
      damage = 25;
      color = '#f97316'; // Neon orange
      glowColor = '#fb923c';
    } else if (type === 'elite') {
      radius = 32;
      baseHp = 380;
      speed = 58;
      damage = 35;
      color = '#dc2626'; // Red / Crimson
      glowColor = '#ef4444';
    }

    const enemy: Enemy = {
      id: this.nextEntityId++,
      type,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      radius,
      maxHp: Math.round(baseHp * diff.enemyMaxHpMultiplier),
      hp: Math.round(baseHp * diff.enemyMaxHpMultiplier),
      speed: speed * diff.enemySpeedMultiplier,
      damage,
      color,
      glowColor,
      hitFlashTimer: 0,
      stateTimer: 0,
      chargeCooldown: 4.0,
      isTelegraphing: false,
      telegraphTimer: 0,
      chargeDirection: { x: 0, y: 0 },
      shootCooldown: 2.2 + Math.random(),
      isDying: false,
      deathTimer: 0,
      deathDuration: 0.35,
    };

    this.enemies.push(enemy);
  }

  private updateEnemies(dt: number, _diff: ReturnType<typeof getWaveDifficulty>) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Dying animation update
      if (enemy.isDying) {
        enemy.deathTimer += dt;
        if (enemy.deathTimer >= enemy.deathDuration) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      }

      const distToPlayer = getDistance(enemy.x, enemy.y, this.playerX, this.playerY);

      // AI Archetype logic
      if (enemy.type === 'crawler') {
        const angle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * dt;
        enemy.y += Math.sin(angle) * enemy.speed * dt;
      } else if (enemy.type === 'spitter') {
        const preferredDist = 240;
        const angle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);

        if (distToPlayer > preferredDist + 30) {
          enemy.x += Math.cos(angle) * enemy.speed * dt;
          enemy.y += Math.sin(angle) * enemy.speed * dt;
        } else if (distToPlayer < preferredDist - 30) {
          enemy.x -= Math.cos(angle) * enemy.speed * 0.8 * dt;
          enemy.y -= Math.sin(angle) * enemy.speed * 0.8 * dt;
        } else {
          const perp = angle + Math.PI / 2;
          enemy.x += Math.cos(perp) * enemy.speed * 0.5 * dt;
          enemy.y += Math.sin(perp) * enemy.speed * 0.5 * dt;
        }

        enemy.shootCooldown -= dt;
        if (enemy.shootCooldown <= 0 && distToPlayer <= 500) {
          enemy.shootCooldown = 2.8 + Math.random() * 0.6;
          this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * 160,
            vy: Math.sin(angle) * 160,
            radius: 5,
            life: 3.5,
            damage: enemy.damage,
          });
        }
      } else if (enemy.type === 'goliath') {
        if (enemy.isTelegraphing) {
          enemy.telegraphTimer -= dt;
          if (enemy.telegraphTimer <= 0) {
            enemy.isTelegraphing = false;
            enemy.vx = enemy.chargeDirection.x * (enemy.speed * 3.2);
            enemy.vy = enemy.chargeDirection.y * (enemy.speed * 3.2);
            enemy.chargeCooldown = 4.5;
          }
        } else {
          enemy.chargeCooldown -= dt;
          if (enemy.chargeCooldown <= 0 && distToPlayer < 350) {
            enemy.isTelegraphing = true;
            enemy.telegraphTimer = 0.6;
            const angle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
            enemy.chargeDirection = { x: Math.cos(angle), y: Math.sin(angle) };
            enemy.vx = 0;
            enemy.vy = 0;
          } else {
            const angle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
            enemy.x += Math.cos(angle) * enemy.speed * dt;
            enemy.y += Math.sin(angle) * enemy.speed * dt;
          }
        }

        if (Math.abs(enemy.vx) > 0 || Math.abs(enemy.vy) > 0) {
          enemy.x += enemy.vx * dt;
          enemy.y += enemy.vy * dt;
          enemy.vx *= 0.94;
          enemy.vy *= 0.94;
        }
      } else if (enemy.type === 'elite') {
        const angle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * dt;
        enemy.y += Math.sin(angle) * enemy.speed * dt;

        enemy.stateTimer += dt;
        if (enemy.stateTimer >= 5.0) {
          enemy.stateTimer = 0;
          this.spawnShockwave(enemy.x, enemy.y, 80, '#ef4444');
          if (distToPlayer < 90) {
            this.damagePlayer(15);
          }
        }
      }

      // Enemy vs Player collision
      if (checkCircleCollision(this.playerX, this.playerY, 14, enemy.x, enemy.y, enemy.radius)) {
        this.damagePlayer(enemy.damage);
        const pushAngle = Math.atan2(enemy.y - this.playerY, enemy.x - this.playerX);
        enemy.x += Math.cos(pushAngle) * 30;
        enemy.y += Math.sin(pushAngle) * 30;
      }
    }
  }

  private updateEnemyBullets(dt: number) {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (checkCircleCollision(this.playerX, this.playerY, 14, b.x, b.y, b.radius)) {
        this.damagePlayer(b.damage);
        this.enemyBullets.splice(i, 1);
        continue;
      }

      if (b.life <= 0) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  public damageEnemy(enemy: Enemy, amount: number) {
    if (enemy.isDying) return;

    enemy.hp -= amount;
    enemy.hitFlashTimer = 0.08;
    audioSystem.playEnemyHit();

    this.floatingTexts.push({
      id: this.nextEntityId++,
      x: enemy.x + (Math.random() - 0.5) * 16,
      y: enemy.y - enemy.radius - 6,
      text: String(amount),
      color: amount > 30 ? '#facc15' : '#ffffff',
      life: 0.6,
      maxLife: 0.6,
      vy: -55,
      scale: amount > 30 ? 1.3 : 1.0,
    });

    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    enemy.isDying = true;
    enemy.deathTimer = 0;
    this.kills++;

    audioSystem.playEnemyExplode();

    if (enemy.type === 'elite') {
      this.hitstopTimer = 0.08;
      this.cameraShake = Math.min(this.cameraShake + 16, 24);
    } else if (enemy.type === 'goliath') {
      this.hitstopTimer = 0.04;
      this.cameraShake = Math.min(this.cameraShake + 10, 18);
    } else {
      this.cameraShake = Math.min(this.cameraShake + 3, 10);
    }

    const pCount = enemy.type === 'elite' ? 24 : enemy.type === 'goliath' ? 16 : 8;
    for (let i = 0; i < pCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.spawnParticle(
        enemy.x,
        enemy.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        enemy.type === 'elite' ? 3.5 : 2.5,
        enemy.glowColor,
        1,
        enemy.type === 'elite' ? 2.5 : 4
      );
    }

    // Drop Energy Gem
    let gemXp = 1;
    let gemColor = '#4ade80'; // Green
    if (enemy.type === 'spitter') {
      gemXp = 5;
      gemColor = '#38bdf8'; // Cyan
    } else if (enemy.type === 'goliath') {
      gemXp = 20;
      gemColor = '#c084fc'; // Purple
    } else if (enemy.type === 'elite') {
      gemXp = 100;
      gemColor = '#facc15'; // Gold
    }

    this.gems.push({
      id: this.nextEntityId++,
      x: enemy.x,
      y: enemy.y,
      xpValue: gemXp,
      color: gemColor,
      radius: gemXp >= 20 ? 8 : gemXp >= 5 ? 6 : 4.5,
      isBeingVacuumed: false,
      speed: 160,
      bobOffset: Math.random() * Math.PI * 2,
    });

    // Roll for Benefit / Power-Up Capsule drop (Nanite Heart 5%, Shield Overload 3%, Weapon Overdrive 2%, Gravity Vacuum 2%)
    const powerUpType = rollPowerUpDrop();
    if (powerUpType) {
      this.spawnPowerUpCapsule(
        powerUpType,
        enemy.x + (Math.random() - 0.5) * 20,
        enemy.y + (Math.random() - 0.5) * 20
      );
    }
  }

  public spawnPowerUpCapsule(type: PowerUpType, x: number, y: number) {
    this.powerUps.push({
      id: this.nextEntityId++,
      type,
      x,
      y,
      radius: 13,
      bobOffset: Math.random() * Math.PI * 2,
      life: 25.0,
      maxLife: 25.0,
    });
  }

  private updatePowerUps(dt: number) {
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.life -= dt;
      if (pu.life <= 0) {
        this.powerUps.splice(i, 1);
        continue;
      }

      const cfg = POWER_UP_CONFIGS[pu.type];

      // Emit ambient glowing aura particles around the capsule on the field
      if (Math.random() < 0.25) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * 10;
        this.spawnParticle(
          pu.x + Math.cos(angle) * dist,
          pu.y + Math.sin(angle) * dist,
          Math.cos(angle) * 14,
          -18 - Math.random() * 15,
          2.2,
          cfg.glowColor,
          0.85,
          2.5
        );
      }

      const distToPlayer = getDistance(this.playerX, this.playerY, pu.x, pu.y);

      // Gentle magnetic pull when astronaut gets close
      if (distToPlayer <= 75) {
        const pullAngle = Math.atan2(this.playerY - pu.y, this.playerX - pu.x);
        pu.x += Math.cos(pullAngle) * 190 * dt;
        pu.y += Math.sin(pullAngle) * 190 * dt;
      }

      // Pickup collision when touched by astronaut
      if (distToPlayer <= 24) {
        this.activatePowerUp(pu);
        this.powerUps.splice(i, 1);
      }
    }
  }

  private activatePowerUp(pu: PowerUpCapsule) {
    const cfg = POWER_UP_CONFIGS[pu.type];
    audioSystem.playPowerUp();
    this.spawnShockwave(this.playerX, this.playerY, 65, cfg.color);

    // Count active buff floating texts near player to stagger vertically and prevent overlap
    const activePlayerTexts = this.floatingTexts.filter(
      (ft) => ft.scale >= 1.3 && Math.abs(ft.x - this.playerX) < 60 && ft.life > 1.0
    ).length;

    // Spawn prominent floating buff text above astronaut
    this.floatingTexts.push({
      id: this.nextEntityId++,
      x: this.playerX,
      y: this.playerY - 30 - activePlayerTexts * 22,
      text: cfg.floatingText,
      color: cfg.color,
      life: 1.85,
      maxLife: 1.85,
      vy: -26,
      scale: 1.45,
    });

    switch (pu.type) {
      case 'nanite_heart': {
        // Restore 15% Max HP immediately + activate +1 HP/sec regen for 8 seconds
        const healAmount = Math.max(1, Math.round(this.stats.maxHp * 0.15));
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + healAmount);
        this.naniteRegenTimer = 8.0;
        this.naniteTickAccumulator = 0;

        this.floatingTexts.push({
          id: this.nextEntityId++,
          x: this.playerX,
          y: this.playerY - 14,
          text: `+${healAmount} HP`,
          color: '#4ade80',
          life: 0.9,
          maxLife: 0.9,
          vy: -28,
          scale: 1.15,
        });
        break;
      }

      case 'shield_overload': {
        // Instant blue protective bubble that blocks 1 hit completely, lasting until broken
        this.shieldOverloadActive = true;
        break;
      }

      case 'weapon_overdrive': {
        // +1 extra laser projectile and +50% fire rate for 6 seconds
        this.weaponOverdriveTimer = 6.0;
        break;
      }

      case 'gravity_vacuum': {
        // Immediately vacuum ALL Energy Gems on the field towards the player
        for (const gem of this.gems) {
          gem.isBeingVacuumed = true;
          gem.speed = Math.max(gem.speed, 380);
        }
        break;
      }
    }

    this.notifyStats();
  }

  private updateGems(dt: number) {
    const magnetDist = this.stats.magnetRadius;

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      const dist = getDistance(this.playerX, this.playerY, gem.x, gem.y);

      if (dist <= magnetDist) {
        gem.isBeingVacuumed = true;
      }

      if (gem.isBeingVacuumed) {
        gem.speed += 450 * dt;
        const angle = Math.atan2(this.playerY - gem.y, this.playerX - gem.x);
        gem.x += Math.cos(angle) * gem.speed * dt;
        gem.y += Math.sin(angle) * gem.speed * dt;

        if (dist <= 18) {
          this.collectGem(gem);
          this.gems.splice(i, 1);
        }
      }
    }
  }

  private collectGem(gem: Gem) {
    this.gemsCollected++;
    this.playerXp += gem.xpValue;
    audioSystem.playGemPickup(gem.xpValue);

    for (let i = 0; i < 4; i++) {
      this.spawnParticle(
        this.playerX + (Math.random() - 0.5) * 14,
        this.playerY + (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        2,
        gem.color,
        1,
        4
      );
    }

    if (this.playerXp >= this.playerXpNeeded) {
      this.triggerLevelUp();
    }
  }

  private triggerLevelUp() {
    this.playerLevel++;
    this.playerXp -= this.playerXpNeeded;
    this.playerXpNeeded = calculateXpNeeded(this.playerLevel);

    audioSystem.playLevelUp();
    this.spawnShockwave(this.playerX, this.playerY, 90, '#facc15');

    this.pause();
    this.callbacks.onLevelUp(this.playerLevel, this.stats);
  }

  public damagePlayer(amount: number) {
    if (this.isGameOver) return;

    // 1. Check Shield Overload Power-Up (Blocks 1 entire hit of damage, lasts until broken)
    if (this.shieldOverloadActive) {
      this.shieldOverloadActive = false;
      audioSystem.playShieldHit();
      this.spawnShockwave(this.playerX, this.playerY, 70, '#38bdf8');
      this.floatingTexts.push({
        id: this.nextEntityId++,
        x: this.playerX,
        y: this.playerY - 26,
        text: 'SHIELD BLOCKED!',
        color: '#38bdf8',
        life: 0.75,
        maxLife: 0.75,
        vy: -42,
        scale: 1.2,
      });
      this.notifyStats();
      return;
    }

    this.playerHurtFlashTimer = 0.12;

    // 2. Check Passive Shield Generator absorb
    if (this.currentShield > 0) {
      audioSystem.playShieldHit();
      if (this.currentShield >= amount) {
        this.currentShield -= amount;
        this.floatingTexts.push({
          id: this.nextEntityId++,
          x: this.playerX,
          y: this.playerY - 24,
          text: `BLOCKED ${amount}`,
          color: '#38bdf8',
          life: 0.5,
          maxLife: 0.5,
          vy: -40,
          scale: 0.9,
        });
        return;
      } else {
        const remaining = amount - this.currentShield;
        this.currentShield = 0;
        this.shieldRechargeTimer = 0;
        amount = remaining;
        this.spawnShockwave(this.playerX, this.playerY, 60, '#38bdf8');
      }
    }

    // 3. Direct HP damage
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    audioSystem.playPlayerHurt();
    this.cameraShake = Math.min(this.cameraShake + 12, 20);

    this.floatingTexts.push({
      id: this.nextEntityId++,
      x: this.playerX,
      y: this.playerY - 20,
      text: `-${amount}`,
      color: '#ef4444',
      life: 0.6,
      maxLife: 0.6,
      vy: -45,
      scale: 1.1,
    });

    if (this.stats.hp <= 0) {
      this.handlePlayerDeath();
    }
  }

  private handlePlayerDeath() {
    this.isGameOver = true;
    audioSystem.playGameOver();
    this.cameraShake = 22;

    const finalScore = calculateScore(this.survivalSeconds, this.kills, this.playerLevel, this.gemsCollected);

    setTimeout(() => {
      this.callbacks.onGameOver({
        survivalSeconds: Math.floor(this.survivalSeconds),
        kills: this.kills,
        level: this.playerLevel,
        score: finalScore,
        gemsCollected: this.gemsCollected,
      });
    }, 450);
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    color: string,
    alpha: number,
    decay: number,
    shape: 'circle' | 'spark' | 'ring' = 'circle'
  ) {
    const p = this.particles.find((item) => !item.active);
    if (!p) return;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.radius = radius;
    p.color = color;
    p.alpha = alpha;
    p.decay = decay;
    p.shape = shape;
  }

  private spawnShockwave(x: number, y: number, maxRadius: number, color: string) {
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      this.spawnParticle(x, y, Math.cos(angle) * (maxRadius * 2), Math.sin(angle) * (maxRadius * 2), 3, color, 1, 3.5);
    }
  }

  private notifyStats() {
    this.callbacks.onStatsChange({
      hp: Math.ceil(this.stats.hp),
      maxHp: this.stats.maxHp,
      shield: Math.ceil(this.currentShield),
      maxShield: this.stats.shieldMax,
      level: this.playerLevel,
      xp: this.playerXp,
      xpNeeded: this.playerXpNeeded,
      survivalSeconds: Math.floor(this.survivalSeconds),
      kills: this.kills,
      shieldOverload: this.shieldOverloadActive,
      frenzyTimer: Math.ceil(this.weaponOverdriveTimer),
      regenBuffTimer: Math.ceil(this.naniteRegenTimer),
    });
  }

  // =====================
  // CANVAS RENDERING
  // =====================
  private render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.cameraShake > 0) {
      shakeOffsetX = (Math.random() - 0.5) * this.cameraShake * 2;
      shakeOffsetY = (Math.random() - 0.5) * this.cameraShake * 2;
    }

    ctx.save();
    ctx.fillStyle = '#06070e';
    ctx.fillRect(0, 0, width, height);

    const originX = width / 2 - this.cameraX + shakeOffsetX;
    const originY = height / 2 - this.cameraY + shakeOffsetY;

    // 1. Draw Looping Planet Background & Parallax Starfield
    this.drawBackground(ctx, originX, originY, width, height);

    ctx.save();
    ctx.translate(originX, originY);

    // 2. Draw Energy Gems (Pickups)
    this.drawGems(ctx);

    // 2b. Draw Power-Up Capsules (Glowing Benefit Drops)
    this.drawPowerUps(ctx);

    // 3. Draw Laser Beams
    this.drawLaserBeams(ctx);

    // 4. Draw Enemies
    this.drawEnemies(ctx);

    // 5. Draw Enemy Bullets
    this.drawEnemyBullets(ctx);

    // 6. Draw Player (Astronaut) & Orbitals
    this.drawPlayer(ctx);

    // 7. Draw Particles
    this.drawParticles(ctx);

    // 8. Draw Floating Damage & Buff Numbers
    this.drawFloatingTexts(ctx);

    ctx.restore();

    // 9. Low HP peripheral vignette
    if (this.stats.hp < this.stats.maxHp * 0.3) {
      const vignetteAlpha = 0.35 * (1 - this.stats.hp / (this.stats.maxHp * 0.3));
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(1, `rgba(239, 68, 68, ${vignetteAlpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    width: number,
    height: number
  ) {
    for (const star of this.bgStars) {
      const sx = ((star.x + originX * star.speed) % width + width) % width;
      const sy = ((star.y + originY * star.speed) % height + height) % height;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fillRect(sx, sy, star.size, star.size);
    }

    ctx.save();
    ctx.translate(originX, originY);

    const tileSize = 200;
    const startTileX = Math.floor((this.cameraX - width / 2 - 200) / tileSize);
    const endTileX = Math.ceil((this.cameraX + width / 2 + 200) / tileSize);
    const startTileY = Math.floor((this.cameraY - height / 2 - 200) / tileSize);
    const endTileY = Math.ceil((this.cameraY + height / 2 + 200) / tileSize);

    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const x = tx * tileSize;
        const y = ty * tileSize;

        ctx.strokeRect(x, y, tileSize, tileSize);

        const seed = Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453;
        const rand = seed - Math.floor(seed);

        if (rand < 0.25) {
          ctx.beginPath();
          ctx.arc(x + 100, y + 100, 24, 0, Math.PI * 2);
          ctx.strokeStyle = '#1e293b';
          ctx.stroke();
          ctx.fillStyle = '#090d16';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x + 100, y + 100, 4, 0, Math.PI * 2);
          ctx.fillStyle = rand < 0.12 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(168, 85, 247, 0.4)';
          ctx.fill();
        } else if (rand > 0.8) {
          ctx.beginPath();
          ctx.arc(x + 60, y + 140, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  private drawGems(ctx: CanvasRenderingContext2D) {
    const now = performance.now() * 0.003;
    for (const gem of this.gems) {
      const bobY = Math.sin(now + gem.bobOffset) * 3;
      ctx.save();
      ctx.translate(gem.x, gem.y + bobY);

      ctx.beginPath();
      ctx.moveTo(0, -gem.radius * 1.2);
      ctx.lineTo(gem.radius, 0);
      ctx.lineTo(0, gem.radius * 1.2);
      ctx.lineTo(-gem.radius, 0);
      ctx.closePath();

      ctx.fillStyle = gem.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -gem.radius * 0.6);
      ctx.lineTo(gem.radius * 0.5, 0);
      ctx.lineTo(0, gem.radius * 0.6);
      ctx.lineTo(-gem.radius * 0.5, 0);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPowerUps(ctx: CanvasRenderingContext2D) {
    const now = performance.now() * 0.005;

    for (const pu of this.powerUps) {
      const cfg = POWER_UP_CONFIGS[pu.type];
      const bobY = Math.sin(now + pu.bobOffset) * 4;
      const pulse = 1 + Math.sin(now * 2 + pu.bobOffset) * 0.16;

      ctx.save();
      ctx.translate(pu.x, pu.y + bobY);

      // 1. Radiant outer aura glow
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, pu.radius * 2.1 * pulse);
      grad.addColorStop(0, `${cfg.color}88`);
      grad.addColorStop(0.6, `${cfg.color}33`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius * 2.1 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. Rotating energy ring
      ctx.save();
      ctx.rotate(now * 0.8 + pu.bobOffset);
      ctx.strokeStyle = cfg.glowColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius * 1.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Capsule Core Body
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. Inner Distinct Icon Symbol
      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;

      if (pu.type === 'nanite_heart') {
        // Heart / Medical Cross symbol
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(-7, 0, -7, -6, -3.5, -6);
        ctx.bezierCurveTo(-1, -6, 0, -3.5, 0, -3.5);
        ctx.bezierCurveTo(0, -3.5, 1, -6, 3.5, -6);
        ctx.bezierCurveTo(7, -6, 7, 0, 0, 5);
        ctx.closePath();
        ctx.fill();
      } else if (pu.type === 'shield_overload') {
        // Hexagonal Shield emblem
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(5.5, -3.5);
        ctx.lineTo(5.5, 2);
        ctx.lineTo(0, 6.5);
        ctx.lineTo(-5.5, 2);
        ctx.lineTo(-5.5, -3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (pu.type === 'weapon_overdrive') {
        // Lightning Bolt emblem
        ctx.beginPath();
        ctx.moveTo(2, -7);
        ctx.lineTo(-4.5, 1);
        ctx.lineTo(0, 1);
        ctx.lineTo(-2, 7);
        ctx.lineTo(4.5, -1);
        ctx.lineTo(0, -1);
        ctx.closePath();
        ctx.fill();
      } else if (pu.type === 'gravity_vacuum') {
        // U-Magnet emblem
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(0, -1, 4.5, 0, Math.PI, false);
        ctx.moveTo(-4.5, -1);
        ctx.lineTo(-4.5, -5.5);
        ctx.moveTo(4.5, -1);
        ctx.lineTo(4.5, -5.5);
        ctx.stroke();
        // White magnet tips
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -6.5, 3, 2.5);
        ctx.fillRect(3, -6.5, 3, 2.5);
      }

      ctx.restore();
    }
  }

  private drawLaserBeams(ctx: CanvasRenderingContext2D) {
    for (const beam of this.laserBeams) {
      const alpha = beam.life / beam.maxLife;
      ctx.save();
      ctx.strokeStyle = beam.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = beam.width;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = beam.width * 0.45;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.015;
    for (const enemy of this.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      if (enemy.isDying) {
        const progress = enemy.deathTimer / enemy.deathDuration;
        ctx.scale(1 + progress * 0.5, 1 - progress * 0.8);
        ctx.globalAlpha = 1 - progress;
      }

      if (enemy.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = enemy.color;
      }

      if (enemy.isTelegraphing) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(enemy.chargeDirection.x * 220, enemy.chargeDirection.y * 220);
        ctx.stroke();
        ctx.restore();
      }

      const r = enemy.radius;
      const moveAngle = Math.atan2(this.playerY - enemy.y, this.playerX - enemy.x);
      ctx.rotate(moveAngle);

      ctx.strokeStyle = enemy.glowColor;
      ctx.lineWidth = 1.8;
      const legWiggle1 = Math.sin(time + enemy.id) * 3;
      const legWiggle2 = Math.cos(time + enemy.id) * 3;

      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.6);
      ctx.lineTo(r * 0.6, -r * 1.3 + legWiggle1);
      ctx.moveTo(r * 0.2, r * 0.6);
      ctx.lineTo(r * 0.6, r * 1.3 - legWiggle1);

      ctx.moveTo(-r * 0.1, -r * 0.7);
      ctx.lineTo(-r * 0.2, -r * 1.4 + legWiggle2);
      ctx.moveTo(-r * 0.1, r * 0.7);
      ctx.lineTo(-r * 0.2, r * 1.4 - legWiggle2);

      ctx.moveTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(-r * 1.1, -r * 1.1 + legWiggle1);
      ctx.moveTo(-r * 0.5, r * 0.5);
      ctx.lineTo(-r * 1.1, r * 1.1 - legWiggle1);
      ctx.stroke();

      if (enemy.type === 'crawler') {
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(r * 0.6, -4, 3, 3);
        ctx.fillRect(r * 0.6, 1, 3, 3);
      } else if (enemy.type === 'spitter') {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#701a75';
        ctx.beginPath();
        ctx.arc(-r * 0.2, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f472b6';
        ctx.fillRect(r * 0.7, -3, 4, 6);
      } else if (enemy.type === 'goliath') {
        ctx.beginPath();
        ctx.rect(-r, -r * 0.8, r * 2, r * 1.6);
        ctx.fill();
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(-r * 0.6, -r * 0.8, r * 0.35, r * 1.6);
        ctx.fillRect(r * 0.2, -r * 0.8, r * 0.35, r * 1.6);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(r, -5, 6, 3);
        ctx.fillRect(r, 2, 6, 3);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (enemy.hp < enemy.maxHp && (enemy.type === 'goliath' || enemy.type === 'elite')) {
        const barW = r * 2;
        const barH = 4;
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-barW / 2, -r - 12, barW, barH);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-barW / 2, -r - 12, barW * hpPct, barH);
      }

      ctx.restore();
    }
  }

  private drawEnemyBullets(ctx: CanvasRenderingContext2D) {
    for (const b of this.enemyBullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = '#e879f9';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const isMoving = this.keysHeld.size > 0 || this.touchVector.active;
    const walkCycle = isMoving ? Math.sin(performance.now() * 0.018) * 4 : 0;

    ctx.save();
    ctx.translate(this.playerX, this.playerY);

    // 1. Passive Shield Generator Aura
    if (this.currentShield > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fill();
      ctx.setLineDash([]);
    }

    // 2. Shield Overload Power-Up Bubble (Bright solid blue protective bubble around astronaut)
    if (this.shieldOverloadActive) {
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.05;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Specular bubble highlight arc
      ctx.beginPath();
      ctx.arc(0, 0, 20 * pulse, -Math.PI * 0.75, -Math.PI * 0.35);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Weapon Overdrive Aura (Golden electric ring when Frenzy is active)
    if (this.weaponOverdriveTimer > 0) {
      ctx.save();
      ctx.rotate(performance.now() * 0.006);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Orbital Plasma orbs
    if (this.stats.orbitalCount > 0) {
      const count = this.stats.orbitalCount;
      const radius = this.stats.orbitalRadius;
      for (let i = 0; i < count; i++) {
        const angle = this.orbitalAngle + (i * (2 * Math.PI)) / count;
        const orbX = Math.cos(angle) * radius;
        const orbY = Math.sin(angle) * radius;

        ctx.save();
        ctx.translate(orbX, orbY);
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#c084fc';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }
    }

    // Direction rotation
    ctx.rotate(this.playerFacingAngle);

    // Moving legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6, -8 + walkCycle, 6, 4);
    ctx.fillRect(-6, 4 - walkCycle, 6, 4);

    // Astronaut Sprite (Crisp Pixel-Art Style)
    const isHurt = this.playerHurtFlashTimer > 0;
    const bodyColor = isHurt ? '#ffffff' : '#f8fafc';
    const suitTrim = isHurt ? '#ffffff' : '#0284c7';
    const visorColor = isHurt ? '#ffffff' : '#06b6d4';

    // Jetpack backpack
    ctx.fillStyle = '#334155';
    ctx.fillRect(-15, -7, 6, 14);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-16, -5, 2, 3);
    ctx.fillRect(-16, 2, 2, 3);

    // Suit Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-9, -9, 18, 18);

    // Shoulders & Chest harness
    ctx.fillStyle = suitTrim;
    ctx.fillRect(-5, -9, 8, 18);

    // Oxygen pack valve
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-2, -5, 3, 3);

    // Helmet & Visor
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(4, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Visor
    ctx.fillStyle = visorColor;
    ctx.fillRect(4, -5, 6, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, -3, 2, 3);

    // Blaster Weapon held in hands
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 4, 10, 4);
    ctx.fillStyle = this.weaponOverdriveTimer > 0 ? '#facc15' : '#22d3ee';
    ctx.fillRect(16, 5, 4, 2);

    ctx.restore();

    // Under-Character Health Bar
    const barW = 32;
    const barH = 5;
    const hpPct = Math.max(0, this.stats.hp / this.stats.maxHp);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(this.playerX - barW / 2 - 1, this.playerY + 20, barW + 2, barH + 2);

    ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(this.playerX - barW / 2, this.playerY + 21, barW * hpPct, barH);
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = 'center';

    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.2);
      ctx.save();
      ctx.globalAlpha = alpha;
      const fontSize = Math.round(12 * (ft.scale || 1));
      ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
    ctx.restore();
  }

  public destroy() {
    this.pause();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
