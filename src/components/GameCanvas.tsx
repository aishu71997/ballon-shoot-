import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Balloon, BalloonType, Particle, GameMode } from '../types';
import { sounds } from '../utils/sound';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Store, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameCanvasProps {
  score: number;
  lives: number;
  gameMode: GameMode;
  isPlaying: boolean;
  isPaused: boolean;
  timeRemaining: number;
  multiplier: number;
  equippedCrosshair: string; // 'cursor-crosshair' | 'cursor-laser' | 'cursor-wand' | 'cursor-gold'
  equippedTheme: string; // 'sky' | 'sunset' | 'cosmic' | 'emerald'
  infiniteHearts?: boolean;
  onAddScore: (points: number) => void;
  onLoseLife: (amount: number) => void;
  onAddLife: () => void;
  onGameOver: () => void;
  onTickTime: () => void;
  onSetCoins: (updater: (prev: number) => number) => void;
}

// Float texts indicator structure
interface FloatText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  scale: number;
  life: number;
}

interface ExplodingParticle {
  id: string;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}

interface MotionExplosion {
  id: string;
  x: number;
  y: number;
  type: BalloonType;
  particles: ExplodingParticle[];
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  score,
  lives,
  gameMode,
  isPlaying,
  isPaused,
  timeRemaining,
  multiplier,
  equippedCrosshair,
  equippedTheme,
  infiniteHearts = false,
  onAddScore,
  onLoseLife,
  onAddLife,
  onGameOver,
  onTickTime,
  onSetCoins,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dimension ref tracking
  const dimensionsRef = useRef({ width: 800, height: 600 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Game assets / loops states
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatText[]>([]);
  const mouseRef = useRef({ x: -100, y: -100, isOver: false, isClicking: false });
  const missRipplesRef = useRef<{ id: string; x: number; y: number; radius: number; maxRadius: number; alpha: number }[]>([]);

  // Slow motion freeze multiplier
  const freezeTimerRef = useRef<number>(0); // remaining miliseconds
  const isFrozen = useCallback(() => freezeTimerRef.current > 0, []);

  // Tracking Combo hits
  const [comboCount, setComboCount] = useState<number>(0);
  const comboRef = useRef<number>(0);

  // Spawn rates variables
  const lastSpawnTimeRef = useRef<number>(0);
  const spawnIntervalRef = useRef<number>(1400); // ms between bubble spawns

  // Sound toggling state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => sounds.isMuted());

  // Screen shake animation state
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const shakeTimeoutRef = useRef<any>(null);

  const triggerScreenShake = useCallback(() => {
    setIsShaking(true);
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    shakeTimeoutRef.current = setTimeout(() => {
      setIsShaking(false);
    }, 400);
  }, []);

  // React motion particle explosions for pop effect
  const [motionExplosions, setMotionExplosions] = useState<MotionExplosion[]>([]);

  // Set sizing and high DPI adjustments
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    const handleResize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const width = rect.width || 800;
      const height = rect.height || 600;
      
      dimensionsRef.current = { width, height };
      setDimensions({ width, height });

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(containerRef.current);
    handleResize();

    return () => {
      observer.disconnect();
    };
  }, []);

  // Cleanup screen shake timer on unmount
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  // Timer interval for Arcade Game Mode
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const timer = setInterval(() => {
      onTickTime();
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, isPaused, onTickTime]);

  const toggleSound = () => {
    const nextState = !isAudioMuted;
    sounds.setMute(nextState);
    setIsAudioMuted(nextState);
    sounds.playPop();
  };

  // Create floating pop feedback texts helper
  const addFloatText = useCallback((x: number, y: number, text: string, color: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    floatTextsRef.current.push({
      id,
      x,
      y,
      text,
      color,
      alpha: 1,
      scale: 0.8,
      life: 1.0, // stands for 100% life
    });
  }, []);

  // Pop balloon logic handler
  const popBalloon = useCallback((b: Balloon) => {
    if (b.popped) return;
    b.popped = true;

    // Trigger physical sparks
    const particleCount = b.type === 'golden' ? 24 : b.type === 'bomb' ? 35 : 12;
    const baseColor = b.color;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (b.type === 'golden' || b.type === 'bomb') 
        ? 2 + Math.random() * 8 
        : 1 + Math.random() * 5;
      
      particlesRef.current.push({
        id: `${b.id}-p-${i}-${Math.random()}`,
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 1.5), // drifting slightly upwards
        size: 2 + Math.random() * (b.type === 'golden' ? 5 : 3.5),
        color: b.type === 'golden' ? `hsl(${45 + Math.random() * 15}, 100%, ${55 + Math.random() * 30}%)` : baseColor,
        alpha: 1,
        life: 1.0,
        maxLife: 25 + Math.random() * 30, // ticks count
      });
    }

    // Trigger highly satisfying React motion/react particle explosions
    const motionParticlesCount = b.type === 'golden' ? 14 : b.type === 'bomb' ? 20 : b.type === 'heart' ? 12 : 8;
    const reactParticles: ExplodingParticle[] = [];
    const particleBaseColor = b.color || '#38bdf8';
    for (let i = 0; i < motionParticlesCount; i++) {
      const angle = (i / motionParticlesCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const speed = b.type === 'bomb' ? 60 + Math.random() * 80 : 45 + Math.random() * 55;
      reactParticles.push({
        id: `${b.id}-rp-${i}-${Math.random()}`,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: b.type === 'bomb' ? 7 + Math.random() * 9 : (b.type === 'golden' ? 6 + Math.random() * 6 : 4.5 + Math.random() * 4.5),
        color: b.type === 'golden' 
          ? `hsl(${40 + Math.random() * 20}, 100%, 60%)` 
          : b.type === 'freeze'
          ? `hsl(${180 + Math.random() * 20}, 90%, 65%)`
          : b.type === 'heart'
          ? '#f43f5e'
          : b.type === 'bomb'
          ? '#ef4444'
          : particleBaseColor,
        delay: Math.random() * 0.05,
      });
    }

    const explosionId = `${b.id}-${Date.now()}-${Math.random()}`;
    setMotionExplosions((prev) => [
      ...prev,
      {
        id: explosionId,
        x: b.x,
        y: b.y,
        type: b.type,
        particles: reactParticles,
      },
    ]);

    setTimeout(() => {
      setMotionExplosions((prev) => prev.filter((exp) => exp.id !== explosionId));
    }, 1500);

    // Combo logic increments
    comboRef.current += 1;
    setComboCount(comboRef.current);

    // Apply points & coin rewards based on Balloon types
    let scoreGained = b.value;
    let comboMultiplier = 1;
    if (comboRef.current >= 20) comboMultiplier = 3.0;
    else if (comboRef.current >= 10) comboMultiplier = 2.0;
    else if (comboRef.current >= 5) comboMultiplier = 1.5;

    // Calculate final score
    const finalScoreIncrease = Math.round(scoreGained * comboMultiplier);

    if (b.type === 'bomb') {
      sounds.playExplosion();
      onAddScore(-30);
      onSetCoins(prev => Math.max(0, prev - 15));
      addFloatText(b.x, b.y, `-30 pts`, '#ef4444');
      triggerScreenShake();
      
      // If we are in survival mode, bombs cost 1 entire life!
      if (gameMode === 'survival') {
        onLoseLife(1);
      }
      comboRef.current = 0;
      setComboCount(0);
    } 
    else if (b.type === 'freeze') {
      sounds.playFreeze();
      freezeTimerRef.current = 5000; // Trigger 5s slo-mo freeze
      onAddScore(finalScoreIncrease);
      onSetCoins(prev => prev + 10);
      addFloatText(b.x, b.y, `FREEZE SLO-MO +${finalScoreIncrease}`, '#06b6d4');
    }
    else if (b.type === 'heart') {
      sounds.playHeal();
      onAddLife();
      onAddScore(finalScoreIncrease);
      onSetCoins(prev => prev + 5);
      addFloatText(b.x, b.y, `+1 LIFE +${finalScoreIncrease}`, '#ec4899');
    }
    else if (b.type === 'golden') {
      sounds.playGoldenPop();
      onAddScore(finalScoreIncrease);
      onSetCoins(prev => prev + 25);
      addFloatText(b.x, b.y, `GOLDEN +${finalScoreIncrease} (+25 Gold)`, '#fbbf24');
    }
    else {
      sounds.playPop();
      onAddScore(finalScoreIncrease);
      onSetCoins(prev => prev + 1); // standard popper gold gain
      const comboLabel = comboRef.current >= 5 ? ` (x${comboMultiplier} Combo!)` : '';
      addFloatText(b.x, b.y, `+${finalScoreIncrease}${comboLabel}`, '#22c55e');
    }
  }, [gameMode, onAddScore, onLoseLife, onAddLife, onSetCoins, addFloatText]);

  // Click canvas coordinate listener
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.isClicking = true;

    // Check pop hit
    let hitAny = false;
    // Iterate from newest/top-most balloon to oldest
    const currentBalloons = balloonsRef.current;
    for (let i = currentBalloons.length - 1; i >= 0; i--) {
      const b = currentBalloons[i];
      if (b.popped) continue;

      // Distance checking
      const dx = b.x - x;
      const dy = b.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Hit detected! (Adding brief generous offset buffer depending on cursor size)
      const hitRadius = b.size * 1.15;
      if (dist <= hitRadius) {
        popBalloon(b);
        hitAny = true;
        break; // Only pop one balloon per arrow click
      }
    }

    // Trigger Ripple ring if missed standard balloons
    if (!hitAny) {
      // Missing breaks multiplier streak
      if (comboRef.current > 0) {
        comboRef.current = 0;
        setComboCount(0);
      }
      
      const id = `${Date.now()}-${Math.random()}`;
      missRipplesRef.current.push({
        id,
        x,
        y,
        radius: 2,
        maxRadius: 28,
        alpha: 0.8
      });
    }
  };

  // Core high-refresh Canvas tick lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let lastTime = performance.now();

    const renderTick = (time: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const delta = time - lastTime;
      lastTime = time;

      const { width, height } = dimensionsRef.current;

      // 1. Clear background drawing layer
      // To keep visual theme blending, we can draw a completely clear view or solid coloredsky with opacity
      ctx.clearRect(0, 0, width, height);

      if (isPlaying && !isPaused) {
        // Slow mo timer counts ticks
        if (freezeTimerRef.current > 0) {
          freezeTimerRef.current = Math.max(0, freezeTimerRef.current - delta);
        }

        // Spawn balloons if game is actively running
        const spawnTimeGap = isFrozen() ? 2400 : spawnIntervalRef.current;
        if (time - lastSpawnTimeRef.current > spawnTimeGap) {
          const types: { type: BalloonType; weight: number }[] = [
            { type: 'normal', weight: 72 },
            { type: 'golden', weight: 8 },
            { type: 'bomb', weight: 14 },
            { type: 'freeze', weight: 4 },
            { type: 'heart', weight: 2 } // heals life
          ];
          
          // Randomize by weight distribution
          const r = Math.random() * 100;
          let sum = 0;
          let selectedType: BalloonType = 'normal';
          for (const item of types) {
            sum += item.weight;
            if (r <= sum) {
              selectedType = item.type;
              break;
            }
          }

          // Force normal if heart spawn is chosen but lives is already max (3)
          if (selectedType === 'heart' && (lives >= 3 || gameMode === 'arcade')) {
            selectedType = 'normal';
          }

          const colors = [
            '#ef4444', // Red
            '#f97316', // Orange
            '#a855f7', // Purple
            '#ec4899', // Pink
            '#3b82f6', // Blue
            '#10b981', // Green
            '#eab308'  // Yellow
          ];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];

          // Configure level and speed variables (starts low and increases slowly after every level)
          const level = Math.floor(score / 200) + 1;
          const levelSpeedMultiplier = Math.min(1.8, 1 + (level - 1) * 0.08); // 8% slowly per level
          const baseSpeedY = (0.9 + Math.random() * 1.5) * levelSpeedMultiplier; // lower initial speed
          const baseSpeedX = (Math.random() - 0.5) * 0.3; // slightly stabilized lateral sway
          
          const size = selectedType === 'golden' 
            ? 18 + Math.random() * 6 
            : selectedType === 'bomb'
            ? 32 // bombs are big and dangerous
            : selectedType === 'heart'
            ? 22
            : 24 + Math.random() * 10;

          const newBalloon: Balloon = {
            id: `${Date.now()}-${Math.random()}`,
            x: Math.random() * (width - size * 2.2) + size * 1.1,
            y: height + size * 2.0,
            size,
            speedX: baseSpeedX,
            speedY: baseSpeedY,
            type: selectedType,
            color: selectedType === 'golden' 
              ? '#fbbf24' // gold
              : selectedType === 'bomb'
              ? '#1e293b' // deep dark
              : selectedType === 'freeze'
              ? '#06b6d4' // frozen cyan
              : selectedType === 'heart'
              ? '#ec4899' // rose/pink
              : randomColor,
            popped: false,
            value: selectedType === 'golden' ? 50 : selectedType === 'bomb' ? 0 : 10,
            wiggleSpeed: 0.01 + Math.random() * 0.03,
            wiggleAmplitude: 15 + Math.random() * 12,
            wiggleTime: Math.random() * Math.PI * 2,
          };

          balloonsRef.current.push(newBalloon);
          lastSpawnTimeRef.current = time;

          // Adjust future spawn interval slightly based on score
          const idealInterval = Math.max(650, 1400 - (score * 0.15));
          spawnIntervalRef.current = idealInterval;
        }
      }

      // 2. Physics & Draw loop: Balloons
      balloonsRef.current = balloonsRef.current.filter((b) => {
        if (b.popped) return false;

        if (isPlaying && !isPaused) {
          // Slow mo effect speed adjustments
          const finalSpeedY = b.speedY * (isFrozen() ? 0.35 : 1.0);
          b.y -= finalSpeedY;
          b.x += b.speedX;

          // Trigonometric lateral swaying/wiggling
          b.wiggleTime += b.wiggleSpeed;
          const wiggleOffset = Math.sin(b.wiggleTime) * b.wiggleAmplitude * 0.015;
          b.x += wiggleOffset;

          // Containment boundaries
          if (b.x < b.size) { b.x = b.size; b.speedX *= -0.8; }
          if (b.x > width - b.size) { b.x = width - b.size; b.speedX *= -0.8; }
        }

        // Draw balloon
        ctx.save();

        // Let's draw the string thread dangling underneath
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.size);
        ctx.quadraticCurveTo(
          b.x + Math.sin(b.wiggleTime * 1.5) * 8, b.y + b.size + 15,
          b.x, b.y + b.size * 2.3
        );
        ctx.strokeStyle = equippedTheme === 'sky' ? 'rgba(75, 85, 99, 0.28)' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Let's draw the triangle tie knot
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.size - 2);
        ctx.lineTo(b.x - b.size * 0.16, b.y + b.size + b.size * 0.16);
        ctx.lineTo(b.x + b.size * 0.16, b.y + b.size + b.size * 0.16);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();

        // Let's draw the balloon 3D sphere gradient body
        ctx.beginPath();
        const radialGradient = ctx.createRadialGradient(
          b.x - b.size * 0.25,
          b.y - b.size * 0.25,
          b.size * 0.08,
          b.x,
          b.y,
          b.size
        );

        if (b.type === 'golden') {
          radialGradient.addColorStop(0, '#fffbeb');
          radialGradient.addColorStop(0.35, '#fbbf24');
          radialGradient.addColorStop(0.85, '#d97706');
          radialGradient.addColorStop(1, '#92400e');
        } else if (b.type === 'bomb') {
          radialGradient.addColorStop(0, '#fca5a5');
          radialGradient.addColorStop(0.2, '#1e293b');
          radialGradient.addColorStop(0.8, '#0f172a');
          radialGradient.addColorStop(1, '#000000');
        } else if (b.type === 'freeze') {
          radialGradient.addColorStop(0, '#e0f7fa');
          radialGradient.addColorStop(0.4, '#06b6d4');
          radialGradient.addColorStop(0.85, '#0891b2');
          radialGradient.addColorStop(1, '#155e75');
        } else if (b.type === 'heart') {
          radialGradient.addColorStop(0, '#ffd6e8');
          radialGradient.addColorStop(0.35, '#ec4899');
          radialGradient.addColorStop(0.85, '#db2777');
          radialGradient.addColorStop(1, '#9d174d');
        } else {
          // Standard colorful balloon
          radialGradient.addColorStop(0, '#ffffff'); // gloss light sheen
          radialGradient.addColorStop(0.28, b.color);
          radialGradient.addColorStop(1, '#000000aa'); // shadow
        }

        ctx.fillStyle = radialGradient;
        ctx.shadowColor = b.type === 'golden' ? '#fbbf24' : '#000000';
        ctx.shadowBlur = b.type === 'golden' ? 8 : 4;
        ctx.shadowOffsetY = b.type === 'golden' ? 2 : 5;
        // Make sure shadow sits properly
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Draw Inner decorations for Special Balloons
        if (b.type === 'bomb') {
          // Skull icon or danger "X" badge
          ctx.save();
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 15px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', b.x, b.y - 1);
          ctx.restore();
        } 
        else if (b.type === 'freeze') {
          // Hexagonal spinning Snowflake indicator
          ctx.save();
          ctx.strokeStyle = '#ffffff88';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size * 0.55, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#e0f7fa';
          ctx.font = '12px Courier';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('❄️', b.x, b.y);
          ctx.restore();
        }
        else if (b.type === 'heart') {
          // Pink pop emblem
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('❤️', b.x, b.y);
          ctx.restore();
        }
        else if (b.type === 'golden') {
          // Crown/Star badge
          ctx.save();
          ctx.fillStyle = '#fffbeb';
          ctx.font = '12px Georgia';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', b.x, b.y);
          ctx.restore();
        }

        // 4. Missing / Leak Detection checklist logic
        // If the balloon floats past the top of the viewport
        if (b.y < -b.size * 1.5) {
          // Did a normal/special balloon leak?
          if (isPlaying && b.type !== 'bomb') {
            // Bombs floating away is actually positive, so leak is safe
            if (gameMode === 'survival') {
              onLoseLife(1);
              sounds.playExplosion(); // warning rumble
              triggerScreenShake();
            }
            
            // Highlight a transient top leakage flash border state
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.fillRect(0, 0, width, 10);
            ctx.restore();

            // Break user pop combos
            if (comboRef.current > 0) {
              comboRef.current = 0;
              setComboCount(0);
            }
          }
          return false; // delete leaked balloon
        }

        return true;
      });

      // 5. Particles Update & Drawing
      particlesRef.current = particlesRef.current.filter((p) => {
        if (isPlaying && !isPaused) {
          // Speed scale for freeze
          const multiplier = isFrozen() ? 0.35 : 1.0;
          p.x += p.vx * multiplier;
          p.y += p.vy * multiplier;
          p.vy += 0.08 * multiplier; // gravities gravity
          p.life += 1;
          p.alpha = 1.0 - (p.life / p.maxLife);
        }

        if (p.life >= p.maxLife) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Circle or starry glitter particles
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // 6. Miss pointer ripples drawing
      missRipplesRef.current = missRipplesRef.current.filter((r) => {
        if (isPlaying && !isPaused) {
          r.radius += isFrozen() ? 0.4 : 1.25;
          r.alpha = Math.max(0, 1.0 - (r.radius / r.maxRadius));
        }

        if (r.radius >= r.maxRadius) return false;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return true;
      });

      // 7. Floating indicator reward numbers
      floatTextsRef.current = floatTextsRef.current.filter((ft) => {
        if (isPlaying && !isPaused) {
          ft.y -= isFrozen() ? 0.35 : 1.0; // glide upwards
          ft.life -= 0.02; // decrease life
          ft.alpha = Math.max(0, ft.life);
          ft.scale = 0.8 + (1.0 - ft.life) * 0.4;
        }

        if (ft.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.font = `black ${Math.round(15 * ft.scale)}px sans-serif`;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
        return true;
      });

      // 8. Custom mouse cursor drawing (when hovered inside)
      if (mouseRef.current.isOver && mouseRef.current.x > 0) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        ctx.save();
        ctx.shadowBlur = 0; // reset shadows for crisp HUD crosshairs

        // Choose custom crosshair color mapping
        let crosshairColor = '#ef4444'; // default arcade red
        if (equippedCrosshair === 'cursor-laser') crosshairColor = '#f43f5e';
        if (equippedCrosshair === 'cursor-wand') crosshairColor = '#a855f7';
        if (equippedCrosshair === 'cursor-gold') crosshairColor = '#d97706';

        // DRAW ATMOSPHERIC RETICLE SIGHT LINE FROM BOTTOM
        // This makes it incredibly easy to track the pointer location at all times!
        ctx.beginPath();
        ctx.moveTo(width / 2, height);
        ctx.lineTo(mx, my);
        ctx.strokeStyle = equippedCrosshair === 'cursor-laser' 
          ? 'rgba(244, 63, 94, 0.15)' 
          : equippedCrosshair === 'cursor-wand'
          ? 'rgba(168, 85, 247, 0.15)'
          : equippedCrosshair === 'cursor-gold'
          ? 'rgba(217, 119, 6, 0.15)'
          : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash

        if (equippedCrosshair === 'cursor-laser') {
          // Retro laser reticle with glowing guide beams - with high-contrast black backdrops
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(mx - 28, my); ctx.lineTo(mx - 4, my);
          ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 28, my);
          ctx.moveTo(mx, my - 28); ctx.lineTo(mx, my - 4);
          ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + 28);
          ctx.stroke();

          ctx.strokeStyle = crosshairColor;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(mx - 26, my); ctx.lineTo(mx - 5, my);
          ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 26, my);
          ctx.moveTo(mx, my - 26); ctx.lineTo(mx, my - 5);
          ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 26);
          ctx.stroke();

          // Outer glowing loop
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4.0;
          ctx.beginPath();
          ctx.arc(mx, my, 18, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(mx, my, 18, 0, Math.PI * 2);
          ctx.stroke();

          // Deep center dot
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } 
        else if (equippedCrosshair === 'cursor-wand') {
          // Magical sparkling star wand tip - with high-contrast backing
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4.0;
          ctx.beginPath();
          ctx.moveTo(mx, my - 16);
          ctx.lineTo(mx + 16, my);
          ctx.lineTo(mx, my + 16);
          ctx.lineTo(mx - 16, my);
          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = crosshairColor;
          ctx.fillStyle = '#faf5ff';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(mx, my - 14);
          ctx.lineTo(mx + 14, my);
          ctx.lineTo(mx, my + 14);
          ctx.lineTo(mx - 14, my);
          ctx.closePath();
          ctx.stroke();

          // Center magic spark star sparkles
          ctx.fillStyle = '#000000';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✨', mx + 1, my + 1);

          ctx.fillStyle = '#d8b4fe';
          ctx.fillText('✨', mx, my);
        }
        else if (equippedCrosshair === 'cursor-gold') {
          // Heavy golden royal crosshair with target frames and high contrast
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.arc(mx, my, 20, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(mx, my, 20, 0, Math.PI * 2);
          ctx.stroke();
          
          // Outer notch markers
          ctx.fillStyle = '#000000';
          ctx.fillRect(mx - 4, my - 28, 8, 10);
          ctx.fillRect(mx - 4, my + 18, 8, 10);
          ctx.fillRect(mx - 28, my - 4, 10, 8);
          ctx.fillRect(mx + 18, my - 4, 10, 8);

          ctx.fillStyle = '#d97706';
          ctx.fillRect(mx - 2, my - 26, 4, 8);
          ctx.fillRect(mx - 2, my + 18, 4, 8);
          ctx.fillRect(mx - 26, my - 2, 8, 4);
          ctx.fillRect(mx + 18, my - 2, 8, 4);

          // Center fine dot
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fffbeb';
          ctx.beginPath();
          ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        else {
          // Classic pin crosshair dart sight with high-contrast circular outline and guide lines
          // 1. Draw outer black circle
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(mx, my, 14, 0, Math.PI * 2);
          ctx.stroke();

          // 2. Draw inner white circle
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(mx, my, 14, 0, Math.PI * 2);
          ctx.stroke();

          // 3. Draw black guide lines
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(mx - 24, my); ctx.lineTo(mx - 8, my);
          ctx.moveTo(mx + 8, my); ctx.lineTo(mx + 24, my);
          ctx.moveTo(mx, my - 24); ctx.lineTo(mx - 0, my - 8);
          ctx.moveTo(mx, my + 8); ctx.lineTo(mx - 0, my + 24);
          ctx.stroke();

          // 4. Draw red core lines
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mx - 23, my); ctx.lineTo(mx - 9, my);
          ctx.moveTo(mx + 9, my); ctx.lineTo(mx + 23, my);
          ctx.moveTo(mx, my - 23); ctx.lineTo(mx, my - 9);
          ctx.moveTo(mx, my + 9); ctx.lineTo(mx, my + 23);
          ctx.stroke();

          // 5. Draw center dot
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw active freeze shield if freeze slows time
      if (isFrozen()) {
        ctx.save();
        ctx.strokeStyle = '#22d3ee88';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, width, height);
        
        ctx.fillStyle = '#22d3ee22';
        ctx.fillRect(0, 0, width, height);

        // Slowmo textual marker
        ctx.fillStyle = '#0891b2';
        ctx.font = 'bold 12px Courier';
        ctx.fillText(`❄️ SLO-MO ACTIVE: ${(freezeTimerRef.current / 1000).toFixed(1)}s`, 20, 25);
        ctx.restore();
      }

      animId = requestAnimationFrame(renderTick);
    };

    animId = requestAnimationFrame(renderTick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, isPaused, popBalloon, gameMode, score, lives, equippedCrosshair, equippedTheme, isFrozen]);

  return (
    <motion.div
      animate={isShaking ? {
        x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0],
        y: [0, 5, -5, 4, -4, 3, -3, 1, -1, 0]
      } : { x: 0, y: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="relative w-full h-[62vh] min-h-[380px] sm:h-[68vh] rounded-3xl border border-white/20 shadow-2xl overflow-hidden bg-slate-900/45 flex flex-col z-10 select-none"
    >
      
      {/* Floating HUD Panel */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-4 pointer-events-none z-30">
        
        {/* Left Side Status Badges */}
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          {/* Points Badge */}
          <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg select-all text-xs font-bold leading-none text-white transition-transform hover:scale-105">
            <span className="text-yellow-400">🏆</span>
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Points Score</div>
              <div id="hud-score-value" className="text-sm font-extrabold font-mono text-white mt-0.5">{score.toLocaleString()}</div>
            </div>
          </div>

          {/* Dynamic level badge */}
          <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg text-xs font-bold leading-none text-white transition-transform hover:scale-105">
            <span className="text-cyan-400">⚡</span>
            <div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Game level</div>
              <div id="hud-level-value" className="text-sm font-extrabold font-mono text-cyan-300 mt-0.5">Lv. {Math.floor(score / 200) + 1}</div>
            </div>
          </div>

          {/* Time/Lives indicators */}
          {gameMode === 'arcade' ? (
            <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg text-xs font-bold leading-none text-white transition-transform hover:scale-105">
              <span className={`text-red-400 font-semibold text-lg leading-none ${timeRemaining <= 10 && 'animate-pulse'}`}>⏱️</span>
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Time Left</div>
                <div id="hud-timer-value" className={`text-sm font-extrabold font-mono mt-0.5 ${timeRemaining <= 10 ? 'text-red-400 scale-105 font-black' : 'text-emerald-400'}`}>
                  {timeRemaining}s
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-lg text-xs font-bold leading-none text-white transition-transform hover:scale-105">
              <span className="text-pink-500 text-lg leading-none">❤️</span>
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Lives Remaining</div>
                {infiniteHearts ? (
                  <span className="text-xs text-pink-400 font-extrabold font-mono tracking-wider flex items-center gap-1 filter drop-shadow-[0_0_4px_#ec4899] animate-pulse mt-1">
                    ♾️ UNLIMITED
                  </span>
                ) : (
                  <div id="hud-lives-value" className="flex gap-1.5 mt-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`text-sm transition-all duration-300 ${
                          i < lives ? 'opacity-100 scale-110 filter drop-shadow-[0_0_4px_#ec4899]' : 'opacity-20 scale-90 filter brightness-50 grayscale'
                        }`}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Combo Multiplier Alert */}
          {comboCount >= 5 && (
            <div className="bg-amber-500 text-amber-950 font-black px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-lg border border-yellow-300 animate-bounce text-xs leading-none">
              <span>🔥</span>
              <span>
                {comboCount} Combo (x
                {comboCount >= 20 ? '3.0' : comboCount >= 10 ? '2.0' : '1.5'})
              </span>
            </div>
          )}
        </div>

        {/* Right Side Control Buttons */}
        <div className="flex gap-2 pointer-events-auto">
          {/* Mute toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-2xl bg-slate-900/95 border border-white/10 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Dynamic motion/react Particle Explosions Overlays */}
      <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
        <AnimatePresence>
          {motionExplosions.map((exp) => (
            <div key={exp.id} className="absolute" style={{ left: exp.x, top: exp.y }}>
              {exp.particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{
                    x: p.dx,
                    y: [0, p.dy - 10, p.dy + 40], // Parabolic gravity path
                    scale: [1, 1.25, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{
                    duration: exp.type === 'bomb' ? 1.0 : 0.8,
                    ease: "easeOut",
                    delay: p.delay
                  }}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    filter: exp.type === 'golden' || exp.type === 'freeze' ? 'drop-shadow(0 0 6px currentcolor)' : 'none',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}

              {/* Glowing expanding expansion wave */}
              <motion.div
                initial={{ scale: 0.1, opacity: 1, border: `2.5px solid ${exp.particles[0]?.color || '#ffffff'}` }}
                animate={{ scale: [0.1, 1.85], opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: exp.type === 'bomb' ? 120 : 60,
                  height: exp.type === 'bomb' ? 120 : 60,
                }}
              />

              {/* Extra cute emoji flyouts for specialized types! */}
              {exp.type === 'heart' && (
                <motion.div
                  initial={{ y: 0, scale: 0.5, opacity: 1 }}
                  animate={{ y: -65, scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                  className="absolute text-base -translate-x-1/2 -translate-y-1/2 select-none"
                >
                  ❤️
                </motion.div>
              )}
              {exp.type === 'freeze' && (
                <motion.div
                  initial={{ y: 0, scale: 0.5, opacity: 1, rotate: 0 }}
                  animate={{ y: -65, scale: 1.6, opacity: 0, rotate: 180 }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                  className="absolute text-base -translate-x-1/2 -translate-y-1/2 select-none"
                >
                  ❄️
                </motion.div>
              )}
              {exp.type === 'golden' && (
                <motion.div
                  initial={{ y: 0, scale: 0.5, opacity: 1, rotate: 0 }}
                  animate={{ y: -75, scale: 1.7, opacity: 0, rotate: 360 }}
                  transition={{ duration: 0.95, ease: "easeOut" }}
                  className="absolute text-base -translate-x-1/2 -translate-y-1/2 select-none"
                >
                  ⭐
                </motion.div>
              )}
              {exp.type === 'bomb' && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 1 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut" }}
                  className="absolute text-xl -translate-x-1/2 -translate-y-1/2 select-none"
                >
                  💥
                </motion.div>
              )}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Target Canvas Board */}
      <canvas
        id="game-shooting-canvas"
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
          }
        }}
        onPointerEnter={() => {
          mouseRef.current.isOver = true;
        }}
        onPointerLeave={() => {
          mouseRef.current.isOver = false;
        }}
        className={`w-full h-full block bg-transparent ${
          isPlaying && !isPaused ? 'cursor-none' : 'cursor-default'
        }`}
      />

      {/* Game Paused Overlay Screen */}
      {isPaused && isPlaying && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-40 text-center p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm shadow-2xl space-y-4">
            <h2 className="text-2xl font-black text-white font-sans flex items-center justify-center gap-2">
              <span className="text-sky-400">⏸️</span> Game Paused
            </h2>
            <p className="text-xs text-slate-400 leading-normal">
              Your balloons are suspended in the horizon. Take a breath and resume when you are ready to shoot!
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  sounds.playPop();
                  // We simulate a temporary escape toggle back on App component level
                  const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
                  window.dispatchEvent(escapeEvent);
                }}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm px-6 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Resume Flight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Helper instruction tip overlay on startup */}
      {isPlaying && !isPaused && score === 0 && balloonsRef.current.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/70 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 text-white/95 text-xs text-center font-medium pointer-events-none animate-bounce z-20 shadow-md">
          🎯 Aim and click on the floating balloons before they fly away!
        </div>
      )}
    </motion.div>
  );
};
