# 🎈 Balloon Pop Odyssey

Welcome to **Balloon Pop Odyssey**! A highly polished, fast-paced, and responsive interactive desktop & mobile browser game built with **React**, **TypeScript**, and **Tailwind CSS**.

---

## 🌟 Feature Highlights

### 📱 1. Mobile & Touch Screen Adaptability
- **Immediate Response**: Tap inputs trigger immediate crosshair position updates on the game canvas.
- **Micro-Animations**: Features custom touch-feedback ripples and dynamic pop animations perfectly optimized for mobile viewport constraints.
- **Universal Layout**: Fluid rendering across mobile, tablet, and desktop screens with full aspect ratio scaling.

### 💥 2. Plasma Blaster (Blast Weapon)
- **High-Energy Shockwave**: Equip the brand-new **Plasma Blaster** from the cosmetic shop! It unleashes a beautiful expanding shockwave that instantly pops all balloons in a **90px radius**.
- **Visual Reticle**: Styled with dynamic radioactive hazard fins and a glowing plasma energy core.
- **Weapon Charge**: Includes a dedicated charge bar in the lower HUD showing the blaster's heat levels, charging up with consecutive hits and passive state ticks!

### 🌧️ 3. Dynamic Weather Engine
- **Stochastic Transitions**: Atmospheric states shift dynamically during gameplay with on-screen alert banners.
- **Weather Archetypes**:
  - ☀️ **Clear skies**: Normal balloon physics and beautiful standard drifting cloud layers.
  - 🌧️ **Rain Storm**: Reduces ascension speeds by **25%** due to saturated air resistance. Renders a gloomy overlay with real-time downpour particles.
  - ❄️ **Blizzard**: Reduces ascension speeds by **40%** and introduces lateral winter breeze vectors that drift balloons side-to-side. Renders high-fidelity snow particles.

### 🎨 4. Aesthetic Sky Themes & Cosmetics
- Earn **SkyCoins** by popping balloons to purchase:
  - **Custom Weapons/Pins**: Standard Pin, Laser Needle, Magic Wand, Pure Gold Needle, and the Plasma Blaster.
  - **Immersive Themes**: Choose between Sunset, Cosmic Dark, Emerald Garden, and Classic Sky backdrops.

---

## 🛠️ Built With

- **React 18** & **Vite**: Rapid rendering with Zero HMR overhead during production builds.
- **TypeScript**: Complete compile-time type safety across all interactive elements.
- **Tailwind CSS**: Modern utility classes powering clean transitions and responsive design patterns.
- **Lucide React**: Crisp, modern typography and SVG icon sets.
- **Motion (framer-motion)**: Satisfying physics explosions on popped balloons.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000` to start popping balloons!

---

## 🎮 Game Controls

- **Click / Tap**: Pop balloons and fire your active weapon!
- **Escape / P**: Pause or resume the game.
- **M**: Toggle global game audio/music mute.
