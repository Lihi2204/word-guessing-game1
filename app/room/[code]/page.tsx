'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getPlayerId } from '@/lib/supabase';
import { checkAnswer, getDescriptionDifficulty, generateHints } from '@/lib/game-logic';
import ShareButtons from '@/components/ShareButtons';
import Timer from '@/components/Timer';
import { Word, GameRoom } from '@/lib/types';
import { getAllWordsForLookup } from '@/lib/game-logic';

const TOTAL_WORDS = 30;
const TIME_PER_WORD = 30;

type GamePhase = 'loading' | 'waiting' | 'countdown' | 'playing' | 'finished';

interface Attempt {
  player_id: string;
  player_name: string;
  attempt: string;
  is_correct: boolean;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.code as string;

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [playerId, setPlayerId] = useState<string>('');
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [timerKey, setTimerKey] = useState(0);
  const [wordAnswered, setWordAnswered] = useState(false);
  const [error, setError] = useState('');
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [availableHints, setAvailableHints] = useState<string[]>([]);

  // Refs for values needed in realtime callbacks
  const wordIndexRef = useRef(wordIndex);
  wordIndexRef.current = wordIndex;

  // Get player ID
  useEffect(() => {
    setPlayerId(getPlayerId());
  }, []);

  // Fetch room data
  useEffect(() => {
    if (!roomCode) return;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (error || !data) {
        setError('החדר לא נמצא');
        return;
      }

      setRoom(data);

      if (data.status === 'waiting') {
        setPhase('waiting');
      } else if (data.status === 'playing') {
        setPhase('playing');
        setWordIndex(data.current_word_index);
        loadWord(data.words_order, data.current_word_index);
      } else if (data.status === 'finished') {
        setPhase('finished');
      }
    };

    fetchRoom();

    // Subscribe to room changes
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          const newRoom = payload.new as GameRoom;
          setRoom(newRoom);

          if (newRoom.status === 'playing' && phase === 'waiting') {
            setPhase('countdown');
          } else if (newRoom.status === 'finished') {
            setPhase('finished');
          }

          if (newRoom.current_word_index !== wordIndexRef.current && newRoom.status === 'playing') {
            setWordIndex(newRoom.current_word_index);
            loadWord(newRoom.words_order, newRoom.current_word_index);
            setAttempts([]);
            setWordAnswered(false);
            setHintsUsed([]);
            setTimerKey(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_attempts',
          filter: `room_id=eq.${roomCode}`,
        },
        (payload) => {
          const attempt = payload.new as any;
          const playerName = attempt.player_id === room?.player1_id
            ? room?.player1_name
            : room?.player2_name;

          setAttempts(prev => [...prev, {
            player_id: attempt.player_id,
            player_name: playerName || 'שחקן',
            attempt: attempt.attempt,
            is_correct: attempt.is_correct,
          }]);

          if (attempt.is_correct) {
            setWordAnswered(true);
            // The player who answered correctly already advanced the game in handleSubmit
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.player_id !== playerId) {
          setOtherTyping(true);
          setTimeout(() => setOtherTyping(false), 1000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, playerId]);

  // Load word from words order
  const loadWord = (wordsOrder: string[], index: number) => {
    if (!wordsOrder || index >= wordsOrder.length) return;

    const wordName = wordsOrder[index];
    const allWords = getAllWordsForLookup();
    const word = allWords.find(w => w.word === wordName);
    if (word) {
      setCurrentWord(word);
      setAvailableHints(generateHints(word));
      setHintsUsed([]);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown === 0) {
      setPhase('playing');
      if (room?.words_order) {
        loadWord(room.words_order, 0);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdown, room]);

  // Check if current player is the host
  const isHost = room?.player1_id === playerId;
  const isPlayer2 = room?.player2_id === playerId;
  const isInRoom = isHost || isPlayer2;

  // Start game (host only)
  const handleStartGame = async () => {
    if (!isHost || !room?.player2_id) return;

    await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
      })
      .eq('code', roomCode);

    setPhase('countdown');
  };

  // Submit guess
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim() || wordAnswered) return;

    const isCorrect = checkAnswer(userInput, currentWord.word, currentWord.synonyms);

    // Save attempt to database
    await supabase.from('game_attempts').insert({
      room_id: room?.id,
      player_id: playerId,
      word_index: wordIndex,
      attempt: userInput.trim(),
      is_correct: isCorrect,
    });

    // Update score if correct and auto-advance
    if (isCorrect) {
      const scoreField = isHost ? 'player1_score' : 'player2_score';
      await supabase
        .from('game_rooms')
        .update({
          [scoreField]: (isHost ? room?.player1_score : room?.player2_score) || 0 + 10,
        })
        .eq('code', roomCode);

      setWordAnswered(true);
      // Advance to next word immediately (any player who answers correctly can advance)
      if (wordIndex >= TOTAL_WORDS - 1) {
        await supabase
          .from('game_rooms')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString(),
          })
          .eq('code', roomCode);
      } else {
        await supabase
          .from('game_rooms')
          .update({
            current_word_index: wordIndex + 1,
          })
          .eq('code', roomCode);
      }
    }

    setUserInput('');
  };

  // Handle time up or move to next word
  const handleTimeUp = async () => {
    if (!isHost) return; // Only host advances the game

    if (wordIndex >= TOTAL_WORDS - 1) {
      await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('code', roomCode);
    } else {
      await supabase
        .from('game_rooms')
        .update({
          current_word_index: wordIndex + 1,
        })
        .eq('code', roomCode);
    }
  };

  // Handle hint usage
  const handleUseHint = () => {
    if (hintsUsed.length < availableHints.length && !wordAnswered) {
      setHintsUsed([...hintsUsed, availableHints[hintsUsed.length]]);
    }
  };

  // Handle typing broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      supabase.channel(`room:${roomCode}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { player_id: playerId },
      });
      setTimeout(() => setIsTyping(false), 500);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link href="/" className="text-blue-500 hover:underline">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  // Waiting for players
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            {isHost ? 'הזמן חבר/ה למשחק!' : `הצטרפת לחדר של ${room?.player1_name}!`}
          </h1>

          {/* Players Status */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700">{room?.player1_name}</span>
              <span className="text-green-500">✓ מחובר</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">
                {room?.player2_name || 'ממתין לשחקן נוסף...'}
              </span>
              {room?.player2_id ? (
                <span className="text-green-500">✓ מחובר</span>
              ) : (
                <span className="text-yellow-500 animate-pulse">⏳</span>
              )}
            </div>
          </div>

          {/* Share buttons (host only) */}
          {isHost && !room?.player2_id && (
            <ShareButtons roomCode={roomCode} />
          )}

          {/* Start button (host only, when both players connected) */}
          {isHost && room?.player2_id && (
            <button
              onClick={handleStartGame}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl text-xl font-bold transition-colors mt-4"
            >
              התחל משחק!
            </button>
          )}

          {/* Waiting message for player 2 */}
          {isPlayer2 && (
            <div className="text-center text-gray-600 mt-4">
              ממתין ליוצר החדר להתחיל את המשחק...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Countdown
  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 bg-green-600 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <h2 className="text-2xl mb-8">מתחילים!</h2>
          <div className="text-9xl font-bold animate-bounce">
            {countdown === 0 ? '!' : countdown}
          </div>
        </div>
      </div>
    );
  }

  // Game finished
  if (phase === 'finished') {
    const player1Score = room?.player1_score || 0;
    const player2Score = room?.player2_score || 0;
    const winner =
      player1Score > player2Score
        ? room?.player1_name
        : player2Score > player1Score
        ? room?.player2_name
        : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">
            {winner ? '🏆' : '🤝'}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {winner ? `${winner} ניצח/ה!` : 'תיקו!'}
          </h1>

          <div className="bg-gray-50 rounded-xl p-6 my-6">
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {room?.player1_score}
                </div>
                <div className="text-gray-600">{room?.player1_name}</div>
              </div>
              <div className="text-3xl text-gray-300">vs</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {room?.player2_score}
                </div>
                <div className="text-gray-600">{room?.player2_name}</div>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // Playing phase
  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען מילה...</div>
      </div>
    );
  }

  const descriptionDifficulty = getDescriptionDifficulty(wordIndex);
  const description = currentWord.descriptions[descriptionDifficulty];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-lg mx-auto">
        {/* Timer */}
        <div className="mb-4">
          <Timer
            duration={TIME_PER_WORD}
            onTimeUp={handleTimeUp}
            isRunning={!wordAnswered}
            resetKey={timerKey}
          />
        </div>

        {/* Scores */}
        <div className="flex justify-between bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="text-center">
            <div className={`text-xl font-bold ${isHost ? 'text-blue-600' : 'text-gray-600'}`}>
              {room?.player1_score}
            </div>
            <div className="text-sm text-gray-500">
              {room?.player1_name} {isHost && '(את)'}
            </div>
          </div>
          <div className="text-gray-300 self-center">vs</div>
          <div className="text-center">
            <div className={`text-xl font-bold ${isPlayer2 ? 'text-green-600' : 'text-gray-600'}`}>
              {room?.player2_score}
            </div>
            <div className="text-sm text-gray-500">
              {room?.player2_name} {isPlayer2 && '(את)'}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="text-center text-gray-500 mb-4">
          מילה {wordIndex + 1} מתוך {TOTAL_WORDS}
        </div>

        {/* Word Description */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-4">
          <p className="text-xl leading-relaxed text-gray-800 text-center">
            "{description}"
          </p>
        </div>

        {/* Hints Section */}
        <div className="mb-4">
          {hintsUsed.length > 0 && (
            <div className="bg-yellow-50 rounded-xl p-4 mb-2">
              {hintsUsed.map((hint, idx) => (
                <div key={idx} className="text-yellow-800 text-sm">
                  רמז {idx + 1}: {hint}
                </div>
              ))}
            </div>
          )}
          {!wordAnswered && hintsUsed.length < availableHints.length && (
            <button
              onClick={handleUseHint}
              className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 rounded-xl text-sm transition-colors"
            >
              רמז ({hintsUsed.length + 1}/{availableHints.length})
            </button>
          )}
        </div>

        {/* Answer revealed */}
        {wordAnswered && (
          <div className="bg-green-100 text-green-700 p-4 rounded-xl text-center font-semibold mb-4">
            התשובה: {currentWord.word}
          </div>
        )}

        {/* Input Form */}
        {!wordAnswered && (
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                placeholder="הקלידו את התשובה..."
                className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                autoFocus
                dir="rtl"
              />
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                נחש
              </button>
            </div>
          </form>
        )}

        {/* Attempts List */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-2 text-gray-700">ניסיונות:</h3>
          {otherTyping && (
            <div className="text-gray-400 text-sm mb-2 animate-pulse">
              השחקן השני מקליד...
            </div>
          )}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {attempts.length === 0 && !otherTyping && (
              <div className="text-gray-400 text-sm">אין ניסיונות עדיין</div>
            )}
            {attempts.map((attempt, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded ${
                  attempt.is_correct
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                }`}
              >
                <span className="text-gray-600">
                  {attempt.player_name}: "{attempt.attempt}"
                </span>
                <span>
                  {attempt.is_correct ? (
                    <span className="text-green-500">✓ נכון!</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
