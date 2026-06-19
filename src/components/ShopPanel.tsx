import React from 'react';
import { ShopItem } from '../types';
import { Coins, Check, Lock, ShieldCheck, Palette, Crosshair, ArrowLeft, Wand2 } from 'lucide-react';
import { sounds } from '../utils/sound';

interface ShopPanelProps {
  skyCoins: number;
  purchasedIds: string[];
  equippedCrosshair: string;
  equippedTheme: string;
  onBuyItem: (itemId: string, cost: number) => void;
  onEquipItem: (item: ShopItem) => void;
  onBack: () => void;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Cursors / WEAPONS
  {
    id: 'weapon_dart',
    name: 'Classic Dart',
    type: 'crosshair',
    cost: 0,
    purchased: true,
    icon: 'Pin',
    value: 'cursor-crosshair',
    description: 'The reliable old classic. Quick and pinpoint precision.'
  },
  {
    id: 'weapon_laser',
    name: 'Neon Laser',
    type: 'crosshair',
    cost: 150,
    purchased: false,
    icon: 'Zap',
    value: 'cursor-laser',
    description: 'Futuristic red laser sight. Emits warm light energy.'
  },
  {
    id: 'weapon_magic',
    name: 'Cosmic Wand',
    type: 'crosshair',
    cost: 350,
    purchased: false,
    icon: 'Wand2',
    value: 'cursor-wand',
    description: 'Pops balloons with magical starry spark showers.'
  },
  {
    id: 'weapon_gold',
    name: 'Royal Needle',
    type: 'crosshair',
    cost: 500,
    purchased: false,
    icon: 'Crown',
    value: 'cursor-gold',
    description: 'Handcrafted pure 24k gold needle. Majestic pops.'
  },

  // THEMES
  {
    id: 'theme_sky',
    name: 'Blue Horizon',
    type: 'theme',
    cost: 0,
    purchased: true,
    icon: 'Cloud',
    value: 'sky',
    description: 'A gorgeous bright breezy day with high floating clouds.'
  },
  {
    id: 'theme_sunset',
    name: 'Cyber Sunset',
    type: 'theme',
    cost: 100,
    purchased: false,
    icon: 'Palette',
    value: 'sunset',
    description: 'Chill vaporwave synth colors mixing amber waves and violet.'
  },
  {
    id: 'theme_cosmic',
    name: 'Galactic Void',
    type: 'theme',
    cost: 250,
    purchased: false,
    icon: 'Sparkles',
    value: 'cosmic',
    description: 'Deep Indigo cosmos littered with distant bright pulsars.'
  },
  {
    id: 'theme_emerald',
    name: 'Emerald Aurora',
    type: 'theme',
    cost: 200,
    purchased: false,
    icon: 'Eye',
    value: 'emerald',
    description: 'Mesmerizing dark green teal fields mirroring space lights.'
  }
];

export const ShopPanel: React.FC<ShopPanelProps> = ({
  skyCoins,
  purchasedIds,
  equippedCrosshair,
  equippedTheme,
  onBuyItem,
  onEquipItem,
  onBack,
}) => {

  const handleAction = (item: ShopItem) => {
    const isPurchased = purchasedIds.includes(item.id) || item.cost === 0;
    if (isPurchased) {
      onEquipItem(item);
      sounds.playUpgrade();
    } else {
      if (skyCoins >= item.cost) {
        onBuyItem(item.id, item.cost);
        sounds.playMilestone();
      } else {
        sounds.playExplosion(); // No-money buzzing sound
      }
    }
  };

  const weapons = SHOP_ITEMS.filter((item) => item.type === 'crosshair');
  const themes = SHOP_ITEMS.filter((item) => item.type === 'theme');

  return (
    <div className="relative w-full max-w-4xl mx-auto bg-slate-900/95 text-slate-100 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 backdrop-blur-md z-10 flex flex-col gap-6 select-none max-h-[90vh] overflow-y-auto">
      
      {/* Header section */}
      <div className="flex border-b border-slate-800 pb-5 items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playPop();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight font-sans text-white">Balloon Store</h1>
            <p className="text-xs text-slate-400">Unlock custom popping gadgets and visual horizons</p>
          </div>
        </div>

        {/* Currency badge */}
        <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
          <Coins className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Your Coins</div>
            <div className="text-lg font-black font-mono text-amber-300 leading-none">
              {skyCoins.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Grid segments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-1">
        
        {/* WEAPON POPPERS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Crosshair className="w-5 h-5 text-sky-400" />
            <h2 className="font-extrabold text-base text-slate-200">Popping Gears</h2>
          </div>

          <div className="space-y-3">
            {weapons.map((item) => {
              const purchased = purchasedIds.includes(item.id) || item.cost === 0;
              const equipped = equippedCrosshair === item.value;
              const canAfford = skyCoins >= item.cost;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    equipped
                      ? 'bg-sky-500/10 border-sky-500 shadow-lg shadow-sky-500/5'
                      : purchased
                      ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                      : 'bg-slate-950/40 border-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl flex items-center justify-center ${
                      equipped ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.id === 'weapon_gold' ? (
                        <span className="text-lg">👑</span>
                      ) : item.id === 'weapon_magic' ? (
                        <Wand2 className="w-5 h-5" />
                      ) : item.id === 'weapon_laser' ? (
                        <span className="text-red-500 text-lg font-bold">⚡</span>
                      ) : (
                        <span className="text-sky-400 text-lg">📍</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-200">{item.name}</h3>
                      <p className="text-xs text-slate-400 leading-normal max-w-[200px]">{item.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAction(item)}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      equipped
                        ? 'bg-sky-500 text-white shadow-md cursor-default'
                        : purchased
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        : canAfford
                        ? 'bg-amber-500 text-slate-950 hover:scale-105 shadow-md font-extrabold'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {equipped ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Equipped
                      </>
                    ) : purchased ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Equip
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" /> {item.cost} <Coins className="w-3 h-3 text-amber-500 fill-amber-300" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* SKY THEMES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Palette className="w-5 h-5 text-emerald-400" />
            <h2 className="font-extrabold text-base text-slate-200">Sky Horizons</h2>
          </div>

          <div className="space-y-3">
            {themes.map((item) => {
              const purchased = purchasedIds.includes(item.id) || item.cost === 0;
              const equipped = equippedTheme === item.value;
              const canAfford = skyCoins >= item.cost;

              // Background preview thumbnail representation
              let previewBg = 'bg-sky-400';
              if (item.value === 'sunset') previewBg = 'bg-gradient-to-tr from-amber-500 to-pink-600';
              if (item.value === 'cosmic') previewBg = 'bg-gradient-to-tr from-slate-950 to-indigo-900';
              if (item.value === 'emerald') previewBg = 'bg-gradient-to-tr from-teal-950 to-emerald-800';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    equipped
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/5'
                      : purchased
                      ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                      : 'bg-slate-950/40 border-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl border border-slate-700 ${previewBg} flex items-center justify-center p-1 font-bold text-lg select-none`}>
                      {item.value === 'sunset' ? '🌅' : item.value === 'cosmic' ? '🌌' : item.value === 'emerald' ? '🌲' : '🎈'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-200">{item.name}</h3>
                      <p className="text-xs text-slate-400 leading-normal max-w-[200px]">{item.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAction(item)}
                    className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      equipped
                        ? 'bg-emerald-500 text-white shadow-md cursor-default'
                        : purchased
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        : canAfford
                        ? 'bg-amber-500 text-slate-950 hover:scale-105 shadow-md font-extrabold'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {equipped ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Equipped
                      </>
                    ) : purchased ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Equip
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" /> {item.cost} <Coins className="w-3 h-3 text-amber-500 fill-amber-300" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="text-xs text-slate-500 text-center border-t border-slate-800 pt-4 flex flex-wrap justify-center gap-4">
        <span>🎉 Accumulate scores in Arcade & Survival to earn gold.</span>
        <span>✨ Click & balloon popped instantly convert standard points count into coins!</span>
      </div>
    </div>
  );
};
