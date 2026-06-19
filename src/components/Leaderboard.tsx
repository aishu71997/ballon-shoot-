import React, { useState, useEffect } from 'react';
import { HighScore, GameMode } from '../types';
import { Trophy, Star, ShieldAlert, Calendar, RotateCcw } from 'lucide-react';
import { sounds } from '../utils/sound';

interface LeaderboardProps {
  currentMode: GameMode;
  onClose?: () => void;
}

const DEFAULT_SCORES: HighScore[] = [
  { name: 'PopMaster', score: 1250, mode: 'arcade', date: 'Jun 15, 2026', balloonsPopped: 95 },
  { name: 'SkyShooter', score: 1050, mode: 'arcade', date: 'Jun 16, 2026', balloonsPopped: 80 },
  { name: 'BalloonBuster', score: 980, mode: 'survival', date: 'Jun 18, 2026', balloonsPopped: 74 },
  { name: 'FloatyPopper', score: 720, mode: 'arcade', date: 'Jun 19, 2026', balloonsPopped: 58 },
  { name: 'DartDart', score: 650, mode: 'survival', date: 'Jun 14, 2026', balloonsPopped: 50 },
];

export const Leaderboard: React.FC<LeaderboardProps> = ({ currentMode, onClose }) => {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [filterMode, setFilterMode] = useState<GameMode>(currentMode);

  useEffect(() => {
    const raw = localStorage.getItem('balloon_pop_high_scores');
    if (raw) {
      try {
        setScores(JSON.parse(raw));
      } catch (e) {
        setScores(DEFAULT_SCORES);
      }
    } else {
      localStorage.setItem('balloon_pop_high_scores', JSON.stringify(DEFAULT_SCORES));
      setScores(DEFAULT_SCORES);
    }
  }, []);

  const clearLeaderboard = () => {
    if (window.confirm('Are you sure you want to reset the leaderboard?')) {
      const initial = DEFAULT_SCORES;
      localStorage.setItem('balloon_pop_high_scores', JSON.stringify(initial));
      setScores(initial);
      sounds.playExplosion();
    }
  };

  const filteredScores = scores
    .filter((s) => s.mode === filterMode)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // Keep top 8

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl w-full max-w-md mx-auto border border-sky-100 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-200" />
          <h2 className="text-xl font-bold font-sans text-gray-800">Sky Hall of Fame</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-sm font-medium"
          >
            Close
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
        <button
          onClick={() => {
            setFilterMode('arcade');
            sounds.playPop();
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            filterMode === 'arcade'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Arcade Mode (60s)
        </button>
        <button
          onClick={() => {
            setFilterMode('survival');
            sounds.playPop();
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            filterMode === 'survival'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Survival Mode (3 Lives)
        </button>
      </div>

      {/* High Scores Listing */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[280px] pr-1">
        {filteredScores.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No entries for this mode yet. Set a high score now!
          </div>
        ) : (
          filteredScores.map((score, index) => {
            const isTop3 = index < 3;
            const medalColors = [
              'bg-amber-400 text-white shadow-amber-200/50',
              'bg-slate-300 text-slate-800 shadow-slate-200/50',
              'bg-amber-600 text-white shadow-orange-200/50',
            ];

            return (
              <div
                key={`${score.name}-${index}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  index === 0
                    ? 'bg-yellow-50/50 border-yellow-200/60 shadow-sm'
                    : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                      isTop3
                        ? medalColors[index]
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                      {score.name}
                      {index === 0 && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-300 animate-spin" style={{ animationDuration: '4s' }} />}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {score.date}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-sm text-sky-600 font-mono">
                    {score.score.toLocaleString()} pts
                  </div>
                  <div className="text-[10px] text-gray-500">
                    popped: <span className="font-bold text-gray-700">{score.balloonsPopped}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Control Actions / Clear Button */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-sky-400" /> Top 8 scores retained
        </span>
        <button
          onClick={clearLeaderboard}
          className="flex items-center gap-1 hover:text-red-500 hover:underline cursor-pointer font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reset Scores
        </button>
      </div>
    </div>
  );
};
