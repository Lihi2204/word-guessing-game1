'use client';

import { Word } from '@/lib/types';
import { getDescriptionDifficulty } from '@/lib/game-logic';

interface WordDisplayProps {
  word: Word;
  wordIndex: number;
  totalWords: number;
}

export default function WordDisplay({ word, wordIndex, totalWords }: WordDisplayProps) {
  const descriptionDifficulty = getDescriptionDifficulty(wordIndex);
  const description = word.descriptions[descriptionDifficulty];

  return (
    <div className="text-center">
      {/* Progress */}
      <div className="mb-5" style={{ color: 'var(--text-secondary)' }}>
        מילה {wordIndex + 1} מתוך {totalWords}
      </div>

      {/* Description */}
      <div
        className="rounded-xl p-8 transition-smooth"
        style={{
          background: 'var(--background-card)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        <p className="text-xl leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          "{description}"
        </p>
      </div>

      {/* Difficulty Indicator */}
      <div className="mt-4 flex justify-center gap-1.5">
        {['easy', 'medium', 'hard'].map((diff, idx) => (
          <div
            key={diff}
            className="w-2 h-2 rounded-full transition-smooth"
            style={{
              background: idx <= ['easy', 'medium', 'hard'].indexOf(descriptionDifficulty)
                ? '#4d65ff'
                : '#D1D5DB'
            }}
          />
        ))}
      </div>
    </div>
  );
}
