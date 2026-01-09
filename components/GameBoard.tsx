'use client';

import { useState, useCallback, useEffect } from 'react';
import Timer from './Timer';
import WordDisplay from './WordDisplay';
import ScoreBoard from './ScoreBoard';
import Countdown from './Countdown';
import GameSummary from './GameSummary';
import { GameState } from '@/lib/types';
import { checkAnswer, calculateScore, selectWordsForGame, generateHints } from '@/lib/game-logic';

const TOTAL_WORDS = 30;
const TIME_PER_WORD = 20;
const MAX_HINTS = 2;

export default function GameBoard() {
  const [gameState, setGameState] = useState<GameState>({
    currentWordIndex: 0,
    score: 0,
    hintsUsed: 0,
    correctAnswers: 0,
    words: [],
    gameStatus: 'countdown',
    currentHintIndex: 0,
  });

  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | 'skip' | null; word?: string }>({ type: null });
  const [timerResetKey, setTimerResetKey] = useState(0);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [isLoadingWords, setIsLoadingWords] = useState(true);

  // Initialize game
  useEffect(() => {
    const loadWords = async () => {
      setIsLoadingWords(true);
      const words = await selectWordsForGame(TOTAL_WORDS);
      setGameState(prev => ({ ...prev, words }));
      setIsLoadingWords(false);
    };
    loadWords();
  }, []);

  const currentWord = gameState.words[gameState.currentWordIndex];

  const moveToNextWord = useCallback(() => {
    setFeedback({ type: null });
    setUserInput('');
    setRevealedHints([]);
    setTimerResetKey(prev => prev + 1);

    if (gameState.currentWordIndex >= TOTAL_WORDS - 1) {
      setGameState(prev => ({ ...prev, gameStatus: 'finished' }));
    } else {
      setGameState(prev => ({
        ...prev,
        currentWordIndex: prev.currentWordIndex + 1,
        currentHintIndex: 0,
      }));
    }
  }, [gameState.currentWordIndex]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    const isCorrect = checkAnswer(userInput, currentWord.word, currentWord.synonyms);

    if (isCorrect) {
      const pointsEarned = calculateScore(true, revealedHints.length);
      setGameState(prev => ({
        ...prev,
        score: prev.score + pointsEarned,
        correctAnswers: prev.correctAnswers + 1,
      }));
      setFeedback({ type: 'correct', word: currentWord.word });
    } else {
      setFeedback({ type: 'wrong' });
      setUserInput('');
      // Clear wrong feedback after 1.5 seconds to allow retry
      setTimeout(() => {
        setFeedback({ type: null });
      }, 1500);
      return;
    }

    setTimeout(moveToNextWord, 1500);
  }, [currentWord, userInput, revealedHints.length, moveToNextWord]);

  const handleTimeUp = useCallback(() => {
    if (currentWord) {
      moveToNextWord();
    }
  }, [currentWord, moveToNextWord]);

  const handleSkip = useCallback(() => {
    if (currentWord) {
      setFeedback({ type: 'skip', word: currentWord.word });
      setTimeout(moveToNextWord, 2000);
    }
  }, [currentWord, moveToNextWord]);

  const handleHint = useCallback(() => {
    if (!currentWord || revealedHints.length >= MAX_HINTS) return;

    const hints = generateHints(currentWord);
    const nextHint = hints[revealedHints.length];
    if (nextHint) {
      setRevealedHints(prev => [...prev, nextHint]);
      setGameState(prev => ({
        ...prev,
        hintsUsed: prev.hintsUsed + 1,
      }));
    }
  }, [currentWord, revealedHints]);

  const handleCountdownComplete = useCallback(() => {
    setGameState(prev => ({ ...prev, gameStatus: 'playing' }));
  }, []);

  const handlePlayAgain = useCallback(async () => {
    setIsLoadingWords(true);
    const words = await selectWordsForGame(TOTAL_WORDS);
    setGameState({
      currentWordIndex: 0,
      score: 0,
      hintsUsed: 0,
      correctAnswers: 0,
      words,
      gameStatus: 'countdown',
      currentHintIndex: 0,
    });
    setUserInput('');
    setFeedback({ type: null });
    setRevealedHints([]);
    setTimerResetKey(0);
    setIsLoadingWords(false);
  }, []);

  // Show countdown
  if (gameState.gameStatus === 'countdown') {
    return <Countdown onComplete={handleCountdownComplete} />;
  }

  // Show game summary
  if (gameState.gameStatus === 'finished') {
    return (
      <GameSummary
        score={gameState.score}
        correctAnswers={gameState.correctAnswers}
        totalWords={TOTAL_WORDS}
        hintsUsed={gameState.hintsUsed}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Show loading if no words or still loading
  if (!currentWord || isLoadingWords) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-12 w-12 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <div className="text-xl text-gray-600">טוען מילים...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-lg mx-auto">
        {/* Timer */}
        <div className="mb-6">
          <Timer
            duration={TIME_PER_WORD}
            onTimeUp={handleTimeUp}
            isRunning={feedback.type === null}
            resetKey={timerResetKey}
          />
        </div>

        {/* Score Board */}
        <div className="mb-6">
          <ScoreBoard
            score={gameState.score}
            correctAnswers={gameState.correctAnswers}
            hintsUsed={gameState.hintsUsed}
          />
        </div>

        {/* Word Display */}
        <div className="mb-6">
          <WordDisplay
            word={currentWord}
            wordIndex={gameState.currentWordIndex}
            totalWords={TOTAL_WORDS}
          />
        </div>

        {/* Hints Section */}
        {revealedHints.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-700 font-medium mb-2">רמזים:</p>
            <ul className="space-y-1">
              {revealedHints.map((hint, idx) => (
                <li key={idx} className="text-yellow-600">
                  • {hint}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback */}
        {feedback.type && (
          <div
            className={`mb-4 p-4 rounded-xl text-center font-semibold ${
              feedback.type === 'correct'
                ? 'bg-green-100 text-green-700'
                : feedback.type === 'wrong'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {feedback.type === 'correct' && (
              <>נכון! התשובה היא: {feedback.word}</>
            )}
            {feedback.type === 'wrong' && 'לא נכון, נסו שוב!'}
            {feedback.type === 'skip' && (
              <>נגמר הזמן! התשובה היתה: {feedback.word}</>
            )}
          </div>
        )}

        {/* Input Form */}
        {!feedback.type && (
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="הקלידו את התשובה..."
                className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                autoFocus
                dir="rtl"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                נחש
              </button>
            </div>
          </form>
        )}

        {/* Action Buttons */}
        {!feedback.type && (
          <div className="flex gap-3">
            <button
              onClick={handleHint}
              disabled={revealedHints.length >= MAX_HINTS}
              className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                revealedHints.length >= MAX_HINTS
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              רמז ({MAX_HINTS - revealedHints.length} נותרו)
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              דלג
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
