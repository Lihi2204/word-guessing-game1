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
    <div
      className="min-h-screen flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'var(--background-primary)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center transition-smooth"
        style={{
          background: 'var(--background-card)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Emoji */}
        <div className="text-6xl mb-4">{message.emoji}</div>

        {/* Title */}
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          המשחק נגמר!
        </h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{message.text}</p>

        {/* Stats */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'var(--background-secondary)',
            border: '1px solid var(--border-light)'
          }}
        >
          <div className="text-4xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {score}
          </div>
          <div className="mb-5" style={{ color: 'var(--text-secondary)' }}>נקודות</div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {correctAnswers}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>נכונות</div>
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {totalWords - correctAnswers}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>שגויות</div>
            </div>
            <div>
              <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {hintsUsed}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>רמזים</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span>אחוז הצלחה</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
              <div
                className="h-full transition-all duration-1000"
                style={{ width: `${percentage}%`, background: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 rounded-xl font-medium transition-smooth"
            style={{
              background: 'var(--background-card)',
              border: '2px solid var(--border-medium)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            שחק שוב
          </button>
          <Link
            href="/"
            className="block w-full py-3 rounded-xl font-medium transition-smooth"
            style={{
              background: 'var(--background-secondary)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-soft-gray)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--background-secondary)';
            }}
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
