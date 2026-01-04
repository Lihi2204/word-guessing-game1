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
      <div className="mb-4 text-gray-500">
        מילה {wordIndex + 1} מתוך {totalWords}
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl p-6 shadow-md">
        <p className="text-xl leading-relaxed text-gray-800">
          "{description}"
        </p>
      </div>

      {/* Difficulty Indicator */}
      <div className="mt-3 flex justify-center gap-1">
        {['easy', 'medium', 'hard'].map((diff, idx) => (
          <div
            key={diff}
            className={`w-2 h-2 rounded-full ${
              idx <= ['easy', 'medium', 'hard'].indexOf(descriptionDifficulty)
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
