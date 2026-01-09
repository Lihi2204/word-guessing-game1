'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
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
      <div className="min-h-screen flex items-center justify-center home-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-12 w-12" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>טוען מילים...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 animate-fadeIn home-background">
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center mb-6 transition-smooth"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <span className="ml-1">→</span>
          חזרה לדף הבית
        </Link>

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
          <div
            className="mb-4 rounded-xl p-5 transition-smooth"
            style={{
              background: '#FFF9E6',
              border: '1px solid #FFE5A3'
            }}
          >
            <p className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>רמזים:</p>
            <ul className="space-y-2">
              {revealedHints.map((hint, idx) => (
                <li key={idx} className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--warning)' }}></span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Feedback */}
        {feedback.type && (
          <div
            className="mb-4 p-5 rounded-xl text-center font-medium transition-smooth animate-fadeIn"
            style={{
              background: feedback.type === 'correct'
                ? 'var(--success)'
                : feedback.type === 'wrong'
                ? 'var(--error)'
                : 'var(--background-secondary)',
              color: feedback.type === 'skip' ? 'var(--text-primary)' : '#FFFFFF',
              border: `1px solid ${
                feedback.type === 'correct'
                  ? '#059669'
                  : feedback.type === 'wrong'
                  ? '#DC2626'
                  : 'var(--border-light)'
              }`
            }}
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
            <div className="flex gap-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="הקלידו את התשובה..."
                className="flex-1 px-4 py-3 text-lg rounded-xl focus:outline-none transition-smooth"
                style={{
                  background: 'var(--background-secondary)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                autoFocus
                dir="rtl"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(77, 101, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-medium transition-smooth"
                style={{
                  background: 'var(--brand-blue)',
                  border: 'none',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 4px rgba(77, 101, 255, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(4px)';
                  e.currentTarget.style.background = 'var(--brand-blue-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'var(--brand-blue)';
                }}
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
              className="flex-1 py-3 rounded-xl font-medium transition-smooth"
              style={{
                background: revealedHints.length >= MAX_HINTS
                  ? 'var(--background-secondary)'
                  : '#FFF9E6',
                border: `1px solid ${revealedHints.length >= MAX_HINTS ? 'var(--border-light)' : '#FFE5A3'}`,
                color: revealedHints.length >= MAX_HINTS
                  ? 'var(--text-muted)'
                  : 'var(--text-primary)',
                cursor: revealedHints.length >= MAX_HINTS ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (revealedHints.length < MAX_HINTS) {
                  e.currentTarget.style.background = '#FFF5CC';
                }
              }}
              onMouseLeave={(e) => {
                if (revealedHints.length < MAX_HINTS) {
                  e.currentTarget.style.background = '#FFF9E6';
                }
              }}
            >
              רמז ({MAX_HINTS - revealedHints.length} נותרו)
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-xl font-medium transition-smooth"
              style={{
                background: 'var(--background-secondary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.background = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--background-secondary)';
              }}
            >
              דלג
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
