'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getPlayerId } from '@/lib/supabase';
import { checkAnswer, getDescriptionDifficulty, generateHints } from '@/lib/game-logic';
import confetti from 'canvas-confetti';
import ShareButtons from '@/components/ShareButtons';
import { Word, GameRoom } from '@/lib/types';
import { getAllWordsForLookup } from '@/lib/game-logic';

const TOTAL_WORDS = 20;
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
  const [serverTimeLeft, setServerTimeLeft] = useState(TIME_PER_WORD);
  const [wordAnswered, setWordAnswered] = useState(false);
  const [error, setError] = useState('');
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [availableHints, setAvailableHints] = useState<string[]>([]);
  const [isNewGuest, setIsNewGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [opponentCorrectPopup, setOpponentCorrectPopup] = useState<string | null>(null);

  // Refs for values needed in realtime callbacks
  const wordIndexRef = useRef(wordIndex);
  wordIndexRef.current = wordIndex;
  const wordAnsweredRef = useRef(wordAnswered);
  wordAnsweredRef.current = wordAnswered;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const roomRef = useRef(room);
  roomRef.current = room;

  // Check if current player is the host
  const isHost = room?.player1_id === playerId;
  const isPlayer2 = room?.player2_id === playerId;
  const isInRoom = isHost || isPlayer2;

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

      // Check if this is a new guest who needs to join
      const currentPlayerId = getPlayerId();
      const isCurrentHost = data.player1_id === currentPlayerId;
      const isCurrentPlayer2 = data.player2_id === currentPlayerId;

      if (!isCurrentHost && !isCurrentPlayer2 && data.status === 'waiting' && !data.player2_id) {
        setIsNewGuest(true);
      }

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

          if (newRoom.status === 'playing' && phaseRef.current === 'waiting') {
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
            setServerTimeLeft(TIME_PER_WORD);
            setOpponentCorrectPopup(null);
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
          const currentRoom = roomRef.current;
          const playerName = attempt.player_id === currentRoom?.player1_id
            ? currentRoom?.player1_name
            : currentRoom?.player2_name;

          setAttempts(prev => [...prev, {
            player_id: attempt.player_id,
            player_name: playerName || 'שחקן',
            attempt: attempt.attempt,
            is_correct: attempt.is_correct,
          }]);

          if (attempt.is_correct) {
            setWordAnswered(true);
            // Show popup if opponent answered correctly (not me)
            if (attempt.player_id !== playerId) {
              // Show popup with opponent's name
              setOpponentCorrectPopup(playerName || 'היריב');
            } else {
              // I answered correctly - show confetti (in case realtime fires)
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
            }
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

  // Polling fallback for realtime updates (in case Supabase Realtime doesn't work)
  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'playing') return;

    const pollRoom = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (data) {
        setRoom(data);

        // Handle status changes
        if (data.status === 'playing' && phaseRef.current === 'waiting') {
          setPhase('countdown');
        } else if (data.status === 'finished') {
          setPhase('finished');
        }

        // Handle word advancement
        if (data.current_word_index !== wordIndexRef.current && data.status === 'playing' && phaseRef.current === 'playing') {
          setWordIndex(data.current_word_index);
          loadWord(data.words_order, data.current_word_index);
          setAttempts([]);
          setWordAnswered(false);
          setHintsUsed([]);
          setServerTimeLeft(TIME_PER_WORD);
          setOpponentCorrectPopup(null);
        }
      }
    };

    const interval = setInterval(pollRoom, 2000);
    return () => clearInterval(interval);
  }, [roomCode, phase]);

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

  // Handle time up or move to next word
  const handleTimeUp = useCallback(async () => {
    if (!isHost || wordAnsweredRef.current) return;

    if (wordIndexRef.current >= TOTAL_WORDS - 1) {
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
          current_word_index: wordIndexRef.current + 1,
          word_started_at: new Date().toISOString(),
        })
        .eq('code', roomCode);
    }
  }, [isHost, roomCode]);

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

  // Synchronized timer based on server time
  useEffect(() => {
    if (!room?.word_started_at || phase !== 'playing' || wordAnswered) return;

    const updateTimer = () => {
      const startTime = new Date(room.word_started_at!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, TIME_PER_WORD - elapsed);
      setServerTimeLeft(remaining);

      if (remaining <= 0) {
        handleTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room?.word_started_at, phase, wordAnswered, handleTimeUp]);

  // Start game (host only)
  const handleStartGame = async () => {
    if (!isHost || !room?.player2_id) return;

    await supabase
      .from('game_rooms')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
        word_started_at: new Date().toISOString(),
        current_word_index: 0,
      })
      .eq('code', roomCode);

    setPhase('countdown');
  };

  // Join as guest
  const handleJoinAsGuest = async () => {
    if (!guestName.trim()) return;

    setIsJoining(true);

    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({
        player2_id: playerId,
        player2_name: guestName.trim(),
      })
      .eq('code', roomCode);

    if (updateError) {
      setError('שגיאה בהצטרפות לחדר');
      setIsJoining(false);
      return;
    }

    localStorage.setItem('playerName', guestName.trim());

    // Fetch updated room data to see ourselves as player2
    const { data: updatedRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', roomCode)
      .single();

    if (updatedRoom) {
      setRoom(updatedRoom);
    }

    setIsNewGuest(false);
    setIsJoining(false);
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
      const newScore = ((isHost ? room?.player1_score : room?.player2_score) || 0) + 10;

      setWordAnswered(true);

      // Show confetti for correct answer
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Update score immediately
      await supabase
        .from('game_rooms')
        .update({
          [scoreField]: newScore,
        })
        .eq('code', roomCode);

      // Wait 3 seconds then advance to next word
      setTimeout(async () => {
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
              word_started_at: new Date().toISOString(),
            })
            .eq('code', roomCode);
        }
      }, 3000);
    }

    setUserInput('');
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

  // New guest joining
  if (isNewGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">הצטרף למשחק!</h1>
          <p className="text-gray-600 text-center mb-6">{room?.player1_name} מזמין אותך לדו קרב</p>

          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="הכנס את השם שלך..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none mb-4"
            dir="rtl"
          />

          <button
            onClick={handleJoinAsGuest}
            disabled={isJoining || !guestName.trim()}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-4 rounded-xl text-xl font-bold transition-colors"
          >
            {isJoining ? 'מצטרף...' : 'הצטרף למשחק'}
          </button>
        </div>
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
            <>
              <ShareButtons roomCode={roomCode} />
              <Link
                href="/play"
                className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors mt-4"
              >
                בינתיים, שחק משחק יחיד
              </Link>
              <p className="text-center text-sm text-gray-500 mt-2">
                כשמישהו יצטרף, תקבל התראה
              </p>
            </>
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
      {/* Opponent Correct Answer Popup */}
      {opponentCorrectPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center animate-bounce">
            <div className="text-5xl mb-4">🎯</div>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {opponentCorrectPopup} ענה/תה נכון!
            </div>
            <div className="text-gray-500">ממשיכים לשאלה הבאה...</div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {/* Timer - Synchronized */}
        <div className="mb-4">
          <div className="flex flex-col items-center gap-2">
            <div className={`text-3xl font-bold ${
              serverTimeLeft <= 5 ? 'text-red-500 animate-pulse' :
              serverTimeLeft <= 10 ? 'text-orange-500' : 'text-blue-600'
            }`}>
              {String(Math.floor(serverTimeLeft / 60)).padStart(2, '0')}:
              {String(serverTimeLeft % 60).padStart(2, '0')}
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  serverTimeLeft <= 5 ? 'bg-red-500' : serverTimeLeft <= 10 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(serverTimeLeft / TIME_PER_WORD) * 100}%` }}
              />
            </div>
          </div>
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
