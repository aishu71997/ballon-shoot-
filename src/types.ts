export type GameMode = 'arcade' | 'survival';
export type GameState = 'menu' | 'playing' | 'gameover' | 'paused';
export type BalloonType = 'normal' | 'golden' | 'bomb' | 'freeze' | 'heart';

export interface Balloon {
  id: string;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  type: BalloonType;
  color: string;
  popped: boolean;
  value: number;
  wiggleSpeed: number;
  wiggleAmplitude: number;
  wiggleTime: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'crosshair' | 'weapon' | 'theme';
  cost: number;
  purchased: boolean;
  icon: string; // Icon name matching Lucide tags or visual signs
  value: string; // The CSS or styling property value
  description: string;
}

export interface HighScore {
  name: string;
  score: number;
  mode: GameMode;
  date: string;
  balloonsPopped: number;
}
