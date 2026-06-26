import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameMode, GameState, HighScore, ShopItem } from './types';
import { SkyBackground } from './components/SkyBackground';
import { GameCanvas } from './components/GameCanvas';
import { ShopPanel, SHOP_ITEMS } from './components/ShopPanel';
import { Leaderboard } from './components/Leaderboard';
import { sounds } from './utils/sound';
import { 
  Trophy, 
  Coins, 
  Gamepad2, 
  Play, 
  Settings, 
  Store, 
  RotateCcw, 
  User, 
  Sparkles, 
  Heart, 
  Zap, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  HelpCircle,
  Clock,
  Skull
} from 'lucide-react';

export default function App() {
  // Game state variables
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [multiplier, setMultiplier] = useState<number>(1);

  // Shop state variables (persisted locally)
  const [skyCoins, setSkyCoins] = useState<number>(() => {
    const saved = localStorage.getItem('balloon_pop_sky_coins');
    return saved ? parseInt(saved, 10) : 100; // start with 100 bonus coins!
  });
  const [purchasedIds, setPurchasedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('balloon_pop_purchased_items');
    return saved ? JSON.parse(saved) : ['weapon_dart', 'theme_sky'];
  });
  const [equippedCrosshair, setEquippedCrosshair] = useState<string>(() => {
    return localStorage.getItem('balloon_pop_equipped_crosshair') || 'cursor-crosshair';
  });
  const [equippedTheme, setEquippedTheme] = useState<string>(() => {
    return localStorage.getItem('balloon_pop_equipped_theme') || 'sky';
  });

  // Sandbox Game Options state
  const [infiniteHearts, setInfiniteHearts] = useState<boolean>(() => {
    return localStorage.getItem('balloon_pop_infinite_hearts') === 'true';
  });

  const toggleInfiniteHearts = () => {
    const nextVal = !infiniteHearts;
    setInfiniteHearts(nextVal);
    localStorage.setItem('balloon_pop_infinite_hearts', String(nextVal));
    sounds.playPop();
  };

  // PWA Install Properties for offline support
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
  }, []);

  const triggerInstallFlow = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install PWA prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // UI Modals
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showShop, setShowShop] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // High score submission state
  const [playerName, setPlayerName] = useState<string>('');
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);

  // Audio system status synchronization
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.isMuted());

  // Dynamic Weather Engine state
  const [weather, setWeather] = useState<'clear' | 'rainy' | 'snowy'>('clear');
  const [weatherNotification, setWeatherNotification] = useState<string | null>(null);

  // Set Local Volume mute status
  const toggleGlobalMute = () => {
    const nextState = !isMuted;
    sounds.setMute(nextState);
    setIsMuted(nextState);
    sounds.playPop();
  };

  // Persist currency whenever modified
  useEffect(() => {
    localStorage.setItem('balloon_pop_sky_coins', skyCoins.toString());
  }, [skyCoins]);

  // Persist purchased lists
  useEffect(() => {
    localStorage.setItem('balloon_pop_purchased_items', JSON.stringify(purchasedIds));
  }, [purchasedIds]);

  // Handle escape keyboard listners for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameState === 'playing') {
          setGameState('paused');
          sounds.playPop();
        } else if (gameState === 'paused') {
          setGameState('playing');
          sounds.playPop();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Weather cycling effect: shifts weather status every 25s when isPlaying
  useEffect(() => {
    if (gameState !== 'playing') {
      // Revert, reset, and clean up weather state on game end/pause
      setWeather('clear');
      setWeatherNotification(null);
      return;
    }

    const weathers: ('clear' | 'rainy' | 'snowy')[] = ['clear', 'rainy', 'snowy'];

    const triggerRandomWeatherChange = () => {
      setWeather((prevWeather) => {
        const otherWeathers = weathers.filter(w => w !== prevWeather);
        // Grab a random alternative weather state
        const nextWeather = otherWeathers[Math.floor(Math.random() * otherWeathers.length)];
        
        let message = '';
        if (nextWeather === 'clear') {
          message = '☀️ Clear skies! Normal balloon ascent speed restored.';
        } else if (nextWeather === 'rainy') {
          message = '🌧️ Rain storm sweeps in! Saturated atmosphere reduces ascent speeds by 25%.';
        } else if (nextWeather === 'snowy') {
          message = '❄️ Freezing Blizzard! Frost reduces ascent speeds by 40% and causes lateral wind drift!';
        }

        setWeatherNotification(message);
        sounds.playMilestone();

        // Staggered cleanup layout
        setTimeout(() => {
          setWeatherNotification((prev) => prev === message ? null : prev);
        }, 4500);

        return nextWeather;
      });
    };

    // Cycle every 25 seconds
    const intervalId = setInterval(triggerRandomWeatherChange, 25000);

    return () => {
      clearInterval(intervalId);
    };
  }, [gameState]);

  // Game start mechanism
  const startGame = (mode: GameMode) => {
    sounds.playUpgrade();
    setGameMode(mode);
    setScore(0);
    setMultiplier(1);
    setScoreSubmitted(false);
    setPlayerName('');

    if (mode === 'arcade') {
      setTimeRemaining(60);
      setLives(3); // Lives don't matter in Arcade but let's reset it
    } else {
      setTimeRemaining(999); // Infinite time for Survival
      setLives(3);
    }
    
    setGameState('playing');
  };

  const handleTickTime = useCallback(() => {
    if (gameState !== 'playing') return;
    
    setTimeRemaining((prev) => {
      if (prev <= 1) {
        // Arcade mode time exhausted
        setGameState('gameover');
        sounds.playGameOver();
        return 0;
      }
      return prev - 1;
    });
  }, [gameState]);

  const handleLoseLife = useCallback((amount: number) => {
    if (infiniteHearts) return; // God mode / infinite hearts avoids any damage!
    setLives((prev) => {
      const nextLives = Math.max(0, prev - amount);
      if (nextLives === 0) {
        setGameState('gameover');
        sounds.playGameOver();
      }
      return nextLives;
    });
  }, [infiniteHearts]);

  const handleAddLife = useCallback(() => {
    setLives((prev) => Math.min(3, prev + 1));
  }, []);

  const handleAddScore = useCallback((amount: number) => {
    setScore((prev) => {
      const nextScore = Math.max(0, prev + amount);
      // Double coin bonus milestone sounds 
      if (nextScore > 0 && nextScore % 500 === 0) {
        sounds.playMilestone();
      }
      return nextScore;
    });
  }, []);

  // Shop item mechanics integrations
  const handleBuyItem = (itemId: string, cost: number) => {
    if (skyCoins >= cost) {
      setSkyCoins((prev) => prev - cost);
      setPurchasedIds((prev) => [...prev, itemId]);
      sounds.playUpgrade();
    }
  };

  const handleEquipItem = (item: ShopItem) => {
    if (item.type === 'crosshair') {
      setEquippedCrosshair(item.value);
      localStorage.setItem('balloon_pop_equipped_crosshair', item.value);
    } else if (item.type === 'theme') {
      setEquippedTheme(item.value);
      localStorage.setItem('balloon_pop_equipped_theme', item.value);
    }
    sounds.playPop();
  };

  // Submit Run log to storage
  const handleSubmitHighScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newRecord: HighScore = {
      name: playerName.trim().substring(0, 12),
      score,
      mode: gameMode,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      balloonsPopped: Math.floor(score / 10), // Estimated popped
    };

    const raw = localStorage.getItem('balloon_pop_high_scores');
    let scoresList: HighScore[] = [];
    if (raw) {
      try {
        scoresList = JSON.parse(raw);
      } catch (err) {
        scoresList = [];
      }
    }

    scoresList.push(newRecord);
    localStorage.setItem('balloon_pop_high_scores', JSON.stringify(scoresList));

    setScoreSubmitted(true);
    sounds.playMilestone();
    setShowLeaderboard(true);
  };

  return (
    <div className={`relative w-full min-h-screen flex flex-col font-sans transition-colors duration-500 overflow-x-hidden ${equippedTheme === 'sky' ? 'text-slate-900' : 'text-white'}`}>
      
      {/* Background with cloud vectors/stars */}
      <SkyBackground theme={equippedTheme} weather={weather} />

      {/* Primary Header with Coin balances and Sounds */}
      <header className="relative w-full max-w-6xl mx-auto px-4 py-4 backdrop-blur-xs flex items-center justify-between z-20 select-none">
        <div 
          onClick={() => { sounds.playPop(); setGameState('menu'); setShowShop(false); setShowLeaderboard(false); }}
          className="flex items-center gap-2.5 cursor-pointer hover:scale-105 transition-transform"
        >
          <span className="text-3xl filter drop-shadow animate-bounce" style={{ animationDuration: '3.5s' }}>🎈</span>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-amber-200 to-sky-300 filter drop-shadow">
              SkyPopper
            </h1>
            <p className="text-[9px] text-white/70 font-semibold uppercase tracking-widest leading-none">Arcade Shooting Canvas</p>
          </div>
        </div>

        {/* Global Toolbar HUD */}
        <div className="flex items-center gap-2">
          {/* Sky Coins Counter */}
          <div 
            onClick={() => { sounds.playPop(); setShowShop(true); }}
            className="bg-slate-950/45 hover:bg-slate-950/65 border border-white/10 px-3.5 py-1.5 rounded-full flex items-center gap-2 cursor-pointer shadow-lg transition-all"
            title="Open Balloon Store"
          >
            <Coins className="w-4 h-4 text-amber-400 fill-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="text-right">
              <span className="text-xs font-black font-mono text-amber-300 leading-none">
                {skyCoins.toLocaleString()}
              </span>
              <span className="text-[8px] text-slate-300 block leading-none font-bold uppercase">Gold</span>
            </div>
          </div>

          {/* Sound Control */}
          <button
            onClick={toggleGlobalMute}
            className="p-2 rounded-full bg-slate-950/45 border border-white/10 text-white/95 hover:bg-slate-950/70 transition-all cursor-pointer shadow-lg"
            title={isMuted ? "Unmute Retro Chimes" : "Mute Retro Chimes"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Container Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-3 flex flex-col justify-center items-center relative z-10">
        <AnimatePresence mode="wait">
          
          {/* MENU SCREEN */}
          {gameState === 'menu' && !showShop && !showLeaderboard && (
            <motion.div
              key="menu-screen"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-sky-100 flex flex-col gap-6 select-none"
            >
              {/* Graphic Title */}
              <div className="text-center space-y-2">
                <span className="bg-sky-500/10 text-sky-600 font-extrabold text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full border border-sky-200/50">
                  ⚡ 100% Client-Side Physics Game
                </span>
                <h2 className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-slate-800">
                  POP THE BALLOONS
                </h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Test your accuracy and reflexes! Pop flying sky-balloons, unlock epic weapon needles and twilight skyboxes, and conquer the global leaderboards.
                </p>
              </div>

              {/* Game Modes selector buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Mode CARD: Arcade */}
                <div 
                  onClick={() => startGame('arcade')}
                  className="bg-sky-50/50 hover:bg-sky-50 border border-sky-100 hover:border-sky-300 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2.5 rounded-xl bg-sky-500 text-white shadow-md">
                        <Clock className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-black text-sky-600 uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-sky-200">
                        60s Limit
                      </span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-800">Arcade Blitz</h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      High capacity speed popper. Pop as many as possible within 60 seconds. Missing balloons has no penalty! Great for coin collection.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-sky-100/60 flex items-center justify-between text-xs text-sky-600 font-black">
                    <span>PLAY ARCADE</span>
                    <span className="group-hover:translate-x-1.5 transition-transform">➡️</span>
                  </div>
                </div>

                {/* Mode CARD: Survival */}
                <div 
                  onClick={() => startGame('survival')}
                  className="bg-pink-50/50 hover:bg-pink-50 border border-pink-100 hover:border-pink-300 p-5 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2.5 rounded-xl bg-pink-500 text-white shadow-md">
                        <Heart className="w-5 h-5 fill-white" />
                      </span>
                      <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-pink-200">
                        3 Health Lives
                      </span>
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-800">Survival Chaser</h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      Every normal balloon leaked or bomb hit will cost 1 Heart. Missing 3 balloons results in absolute Game Over. Intense skill testing!
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-pink-100/60 flex items-center justify-between text-xs text-pink-600 font-black">
                    <span>PLAY SURVIVAL</span>
                    <span className="group-hover:translate-x-1.5 transition-transform">➡️</span>
                  </div>
                </div>

              </div>

              {/* Sandbox Game Options & Mobile Phone Installation Section */}
              <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 font-sans">
                  <div className="space-y-0.5 text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-pink-500 font-bold">💖</span>
                      <h4 className="font-extrabold text-[13px] text-slate-800 uppercase tracking-wide">
                        Infinite Hearts (Easy Sandbox)
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Disable heart deductions and play survival mode infinitely without limits. Perfect for relaxed mobile play!
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    onClick={toggleInfiniteHearts}
                    id="toggle-infinite-hearts"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      infiniteHearts ? 'bg-pink-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        infiniteHearts ? 'translate-x-[20px] bg-white' : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* Mobile & Offline App Installation Guide */}
                <div className="flex flex-col gap-2.5 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">📲</span>
                    <h4 className="font-extrabold text-[13px] text-slate-800 uppercase tracking-wide">
                      Play Offline on Your Phone
                    </h4>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 leading-normal">
                    This game is certified <b>Progressive Web App (PWA)</b> compatible. Once added to your phone, it launches instantly and plays <b>100% offline without any internet connection!</b>
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    {/* Native Install Button (if browser supports it) */}
                    {isInstallable && (
                      <button
                        onClick={triggerInstallFlow}
                        id="pwa-install-button"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-450 active:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow flex items-center justify-center gap-1.5"
                      >
                        ⚡ Install App on this Phone
                      </button>
                    )}

                    {/* Simple Instructions Expand Button */}
                    <details className="w-full text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-xl p-2.5 cursor-pointer select-none">
                      <summary id="pwa-guide-header" className="font-bold flex items-center justify-between text-slate-700 hover:text-slate-900 leading-none">
                        <span>📱 Show Phone Installation Steps</span>
                        <span className="text-[10px] text-slate-400">▼</span>
                      </summary>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/50 space-y-2 leading-relaxed">
                        <div>
                          <span className="font-bold text-sky-600">🤖 For Android (Chrome/Firefox):</span>
                          <p className="pl-3 mt-0.5">Simply click the <b>Install App</b> button above, or click the Chrome menu (3 dots) and select <b>"Add to Home screen"</b> or <b>"Install app"</b>.</p>
                        </div>
                        <div>
                          <span className="font-bold text-pink-600">🍏 For iPhone & iPad (Safari):</span>
                          <p className="pl-3 mt-0.5">Tap the <b>Share icon</b> (square with up arrow) in Safari browser, scroll down, and select <b>"Add to Home Screen"</b>.</p>
                        </div>
                        <div className="text-[10px] text-slate-400 pt-1 font-semibold flex items-center gap-1">
                          <span>✅</span> Supports full-screen immersive view and functions entirely offline!
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>


              {/* Lower HUD helper toolbar buttons */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-t border-slate-100 pt-5">
                <div className="flex gap-2">
                  <button
                    onClick={() => { sounds.playPop(); setShowShop(true); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    <Store className="w-3.5 h-3.5 text-amber-400" /> Weapon Store
                  </button>

                  <button
                    onClick={() => { sounds.playPop(); setShowLeaderboard(true); }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trophy className="w-3.5 h-3.5 text-yellow-500 fill-yellow-200" /> Leaderboard
                  </button>
                </div>

                <button
                  onClick={() => { sounds.playPop(); setShowHelp(!showHelp); }}
                  className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Game Instructions"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Helpful instructions expand accordion */}
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-2 leading-relaxed"
                >
                  <div className="font-extrabold text-slate-800 uppercase tracking-wide text-[10px]">🎈 Balloon Species Guide:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5"><span className="text-sm">🔴</span> Normal (Colored) = +10 pts (+1 Coin)</div>
                    <div className="flex items-center gap-1.5"><span className="text-sm">⭐</span> Golden = +50 pts (+25 Coins Cash)</div>
                    <div className="flex items-center gap-1.5"><span className="text-sm">❄️</span> Freeze Block = Slo-Mo speeds for 5 seconds</div>
                    <div className="flex items-center gap-1.5"><span className="text-sm">❤️</span> Heart Icon = +1 Life Heal (Survival mode)</div>
                    <div className="flex items-center gap-1.5"><span className="text-sm">💀</span> Bomb = hazard! Deducts 30 pts & costs 1 Life</div>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 font-semibold text-slate-500">
                    💡 **Combo multiplier**: Pop 5+ balloons consecutively without missing or leaking to trigger score multiplier spikes (up to 3x)!
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ACTIVE GAME CANVAS STATE */}
          {(gameState === 'playing' || gameState === 'paused') && !showShop && !showLeaderboard && (
            <motion.div
              key="game-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col gap-3"
            >
              {/* Dynamic Game Board and Canvas */}
              <div className="relative">
                <AnimatePresence>
                  {weatherNotification && (
                    <motion.div
                      id="weather-alert-banner"
                      initial={{ opacity: 0, y: -45, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      className="absolute top-18 left-4 right-4 mx-auto max-w-md bg-slate-950/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-sky-400/30 shadow-[0_4px_16px_rgba(56,189,248,0.25)] flex items-center justify-center text-center text-white text-xs font-bold leading-relaxed select-none z-45 pointer-events-none"
                    >
                      <span className="font-sans font-extrabold text-[11px] tracking-tight">{weatherNotification}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <GameCanvas
                  score={score}
                  lives={lives}
                  gameMode={gameMode}
                  isPlaying={gameState === 'playing'}
                  isPaused={gameState === 'paused'}
                  timeRemaining={timeRemaining}
                  multiplier={multiplier}
                  equippedCrosshair={equippedCrosshair}
                  equippedTheme={equippedTheme}
                  infiniteHearts={infiniteHearts}
                  weather={weather}
                  onAddScore={handleAddScore}
                  onLoseLife={handleLoseLife}
                  onAddLife={handleAddLife}
                  onGameOver={() => {
                    setGameState('gameover');
                    sounds.playGameOver();
                  }}
                  onTickTime={handleTickTime}
                  onSetCoins={setSkyCoins}
                />
              </div>

              {/* Lower HUD Action bar */}
              <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-lg text-white font-sans text-xs select-none">
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400">💡</span> Press <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono border border-slate-700">ESC</span> to pause
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sounds.playPop();
                      setGameState(gameState === 'playing' ? 'paused' : 'playing');
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-black transition-all cursor-pointer ${
                      gameState === 'paused'
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                        : 'border-white/20 hover:bg-slate-800'
                    }`}
                  >
                    {gameState === 'paused' ? '▶️ Resume' : '⏸️ Pause'}
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Restart game? You will forfeit current progress.')) {
                        sounds.playExplosion();
                        startGame(gameMode);
                      }
                    }}
                    className="px-3 py-1.5 border border-white/20 hover:bg-slate-800 rounded-lg font-black text-rose-300 transition-all cursor-pointer"
                  >
                    🔄 Restart
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('Forfeit and return to Main Menu?')) {
                        sounds.playExplosion();
                        setGameState('menu');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-300 border border-slate-700 hover:text-white cursor-pointer"
                  >
                    🚪 Quit Menu
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* GAME OVER MODULE */}
          {gameState === 'gameover' && (
            <motion.div
              key="gameover-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-rose-100 flex flex-col gap-5 text-center select-none"
            >
              <div className="space-y-1">
                <span className="text-4xl">🏳️‍🌈</span>
                <h2 className="text-3xl font-black text-red-500 uppercase font-sans tracking-tight">Game Over</h2>
                <p className="text-slate-400 text-xs">The balloon fleet has cleared the horizon</p>
              </div>

              {/* Score Display Card */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-orange-100 p-6 rounded-2xl">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Final Score</div>
                <div id="final-score-value" className="text-4xl font-black font-mono text-slate-800 leading-none my-1">
                  {score.toLocaleString()}
                </div>
                <div className="text-xs text-orange-600 font-bold flex items-center justify-center gap-1">
                  <span>💰</span> +{Math.round(score / 10)} Gold Coins Accumulated!
                </div>
              </div>

              {/* Name submission card */}
              {!scoreSubmitted ? (
                <form onSubmit={handleSubmitHighScore} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <div className="text-xs text-slate-600 font-medium">Record your victory in the Highscores!</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.substring(0, 12))}
                      placeholder="Your Nickname"
                      maxLength={12}
                      required
                      className="flex-1 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl text-slate-800 placeholder-slate-400 text-xs font-bold focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      className="bg-sky-500 hover:bg-sky-450 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow"
                    >
                      <User className="w-3.5 h-3.5" /> Submit
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center justify-center gap-1">
                  🎉 Score uploaded successfully!
                </div>
              )}

              {/* Next Steps Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => startGame(gameMode)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>

                <button
                  onClick={() => {
                    sounds.playPop();
                    setGameState('menu');
                  }}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  🏡 Main Menu
                </button>
              </div>
            </motion.div>
          )}

          {/* PREMIUM WEAPONS & COSMETICS STORE MODAL */}
          {showShop && (
            <motion.div
              key="shop-module"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full"
            >
              <ShopPanel
                skyCoins={skyCoins}
                purchasedIds={purchasedIds}
                equippedCrosshair={equippedCrosshair}
                equippedTheme={equippedTheme}
                onBuyItem={handleBuyItem}
                onEquipItem={handleEquipItem}
                onBack={() => setShowShop(false)}
              />
            </motion.div>
          )}

          {/* HISTORIC HALL OF FAME LEADERBOARDS */}
          {showLeaderboard && (
            <motion.div
              key="leaderboard-module"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full z-10"
            >
              <Leaderboard 
                currentMode={gameMode} 
                onClose={() => setShowLeaderboard(false)} 
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Persistent global footer with help shortcuts */}
      <footer className="relative py-4 border-t border-white/5 bg-slate-950/20 text-center text-[10px] text-white/50 font-sans mt-8 select-none">
        <div>Click and Shoot Balloon Game • Compiled with High Performance Canvas Renderers</div>
        <div className="mt-0.5">Use earned coins in the cosmetic shop to modify weapon crosshair pins. Enjoy!</div>
      </footer>
    </div>
  );
}
