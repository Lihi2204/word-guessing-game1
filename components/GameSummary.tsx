'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface GameSummaryProps {
  score: number;
  correctAnswers: number;
  totalWords: number;
  hintsUsed: number;
  onPlayAgain: () => void;
}

export default function GameSummary({
  score,
  correctAnswers,
  totalWords,
  hintsUsed,
  onPlayAgain,
}: GameSummaryProps) {
  const percentage = Math.round((correctAnswers / totalWords) * 100);

  // Save high score
  useEffect(() => {
    const currentHighScore = localStorage.getItem('wordGameHighScore');
    if (!currentHighScore || score > parseInt(currentHighScore)) {
      localStorage.setItem('wordGameHighScore', score.toString());
    }
  }, [score]);

  const getMessage = () => {
    if (percentage >= 90) return { emoji: '🏆', text: 'מדהים! אתם אלופים!' };
    if (percentage >= 70) return { emoji: '🎉', text: 'כל הכבוד! ביצוע מעולה!' };
    if (percentage >= 50) return { emoji: '👍', text: 'לא רע! אפשר להשתפר!' };
    return { emoji: '💪', text: 'נסו שוב, אתם יכולים יותר!' };
  };

  const message = getMessage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Emoji */}
        <div className="text-6xl mb-4">{message.emoji}</div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">המשחק נגמר!</h1>
        <p className="text-gray-600 mb-6">{message.text}</p>

        {/* Stats */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">{score}</div>
          <div className="text-gray-500 mb-4">נקודות</div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-gray-500">נכונות</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{totalWords - correctAnswers}</div>
              <div className="text-sm text-gray-500">שגויות</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">{hintsUsed}</div>
              <div className="text-sm text-gray-500">רמזים</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>אחוז הצלחה</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            שחק שוב
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-colors"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
