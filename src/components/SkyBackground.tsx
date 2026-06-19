import React, { useMemo } from 'react';
import { Cloud, Sparkles } from 'lucide-react';

interface SkyBackgroundProps {
  theme: string; // 'sky' | 'sunset' | 'cosmic' | 'emerald'
}

export const SkyBackground: React.FC<SkyBackgroundProps> = ({ theme }) => {
  // Translate theme to tailwind gradient classes
  const backgroundClasses = useMemo(() => {
    switch (theme) {
      case 'sunset':
        return 'bg-gradient-to-b from-purple-900 via-pink-700 to-amber-600';
      case 'cosmic':
        return 'bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950';
      case 'emerald':
        return 'bg-gradient-to-b from-teal-900 via-emerald-800 to-zinc-900';
      case 'sky':
      default:
        return 'bg-gradient-to-b from-sky-300 via-sky-400 to-sky-500';
    }
  }, [theme]);

  // Generate static clouds/stars placements once
  const atmosphericElements = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${(i * 20 + 5) % 100}%`,
      top: `${10 + Math.random() * 40}%`,
      scale: 0.5 + Math.random() * 1.2,
      opacity: theme === 'cosmic' ? 0.2 + Math.random() * 0.4 : 0.3 + Math.random() * 0.5,
      delay: `${i * -4}s`,
      speed: 25 + Math.random() * 30, // seconds to traverse
    }));
  }, [theme]);

  return (
    <div className={`absolute inset-0 overflow-hidden select-none pointer-events-none z-0 transition-all duration-1000 ${backgroundClasses}`}>
      {/* Visual Ambient Grid / Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/15" />

      {/* Atmospheric Elements (Clouds for daytime, Star sparks for sunset/cosmic) */}
      {atmosphericElements.map((elem) => {
        const style = {
          left: elem.left,
          top: elem.top,
          transform: `scale(${elem.scale})`,
          opacity: elem.opacity,
          animationDelay: elem.delay,
          animationDuration: `${elem.speed}s`,
        };

        return (
          <div
            key={elem.id}
            id={`atmosphere-elem-${elem.id}`}
            className="absolute animate-float-drift hover:opacity-100 transition-opacity duration-500"
            style={style}
          >
            {theme === 'cosmic' || theme === 'sunset' ? (
              <Sparkles className="text-amber-200/40 w-8 h-8 filter drop-shadow" />
            ) : (
              <Cloud 
                className={`${
                  theme === 'emerald' ? 'text-teal-200/20' : 'text-white/45'
                } w-20 h-10 filter drop-shadow-md`} 
              />
            )}
          </div>
        );
      })}

      {/* Sun/Moon highlight */}
      <div 
        id="sky-celestial-body"
        className={`absolute rounded-full filter blur-xl opacity-20 pointer-events-none transition-all duration-1000 ${
          theme === 'sunset' 
            ? 'w-80 h-80 bg-amber-400 -top-10 right-10'
            : theme === 'cosmic'
            ? 'w-60 h-60 bg-blue-300 top-20 left-20'
            : theme === 'emerald'
            ? 'w-96 h-96 bg-emerald-500 -top-20 left-1/4'
            : 'w-72 h-72 bg-yellow-200 -top-10 right-20'
        }`}
      />

      {/* Drifting sparkle wind layer */}
      {theme === 'cosmic' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-50 animate-pulse duration-10000" />
      )}
    </div>
  );
};
