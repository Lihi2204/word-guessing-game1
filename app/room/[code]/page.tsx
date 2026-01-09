'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getPlayerId } from '@/lib/supabase';
import { checkAnswer, getDescriptionDifficulty, generateHints } from '@/lib/game-logic';
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
  const [correctAnswerPopup, setCorrectAnswerPopup] = useState<string | null>(null);

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
            setCorrectAnswerPopup(null);
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
            // Show popup for both players with the name of who answered correctly
            setCorrectAnswerPopup(playerName || 'שחקן');
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
          setCorrectAnswerPopup(null);
        }
      }
    };

    const interval = setInterval(pollRoom, 2000);
    return () => clearInterval(interval);
  }, [roomCode, phase]);

  // Load word from words order
  const loadWord = async (wordsOrder: string[], index: number) => {
    if (!wordsOrder || index >= wordsOrder.length) return;

    const wordName = wordsOrder[index];
    const allWords = await getAllWordsForLookup();
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
      const myName = isHost ? room?.player1_name : room?.player2_name;

      setWordAnswered(true);
      setCorrectAnswerPopup(myName || 'שחקן');

      // Update score immediately
      await supabase
        .from('game_rooms')
        .update({
          [scoreField]: newScore,
        })
        .eq('code', roomCode);

      // Wait 1 second then advance to next word
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
      }, 1000);
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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background-primary)' }}>
        <div className="text-center">
          <div className="text-xl mb-4" style={{ color: 'var(--error)' }}>{error}</div>
          <Link href="/" className="transition-smooth" style={{ color: 'var(--brand-blue)' }}>
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>טוען...</div>
      </div>
    );
  }

  // New guest joining
  if (isNewGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{ background: 'var(--background-primary)' }}>
        <div className="max-w-md w-full rounded-xl p-8" style={{ background: 'var(--background-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h1 className="text-2xl font-semibold text-center mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>הצטרף למשחק!</h1>
          <p className="text-center mb-6" style={{ color: 'var(--text-secondary)' }}>{room?.player1_name} מזמין אותך לדו קרב</p>

          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="הכנס את השם שלך..."
            className="w-full px-4 py-3 rounded-xl focus:outline-none mb-4 transition-smooth"
            style={{ background: 'var(--background-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--brand-blue)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(77, 101, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            dir="rtl"
          />

          <button
            onClick={handleJoinAsGuest}
            disabled={isJoining || !guestName.trim()}
            className="w-full py-4 rounded-xl text-xl font-medium transition-smooth"
            style={{
              background: (isJoining || !guestName.trim()) ? 'var(--background-secondary)' : 'var(--brand-blue)',
              color: (isJoining || !guestName.trim()) ? 'var(--text-muted)' : '#FFFFFF',
              border: 'none',
              cursor: (isJoining || !guestName.trim()) ? 'not-allowed' : 'pointer',
              boxShadow: (isJoining || !guestName.trim()) ? 'none' : '0 2px 4px rgba(77, 101, 255, 0.15)'
            }}
            onMouseEnter={(e) => {
              if (!isJoining && guestName.trim()) {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.background = 'var(--brand-blue-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isJoining && guestName.trim()) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--brand-blue)';
              }
            }}
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
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{ background: 'var(--background-primary)' }}>
        <div className="max-w-md w-full rounded-xl p-8" style={{ background: 'var(--background-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <h1 className="text-2xl font-semibold text-center mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {isHost ? 'הזמן חבר/ה למשחק!' : `הצטרפת לחדר של ${room?.player1_name}!`}
          </h1>

          {/* Players Status */}
          <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border-light)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'var(--text-primary)' }}>{room?.player1_name}</span>
              <span style={{ color: 'var(--success)' }}>✓ מחובר</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-primary)' }}>
                {room?.player2_name || 'ממתין לשחקן נוסף...'}
              </span>
              {room?.player2_id ? (
                <span style={{ color: 'var(--success)' }}>✓ מחובר</span>
              ) : (
                <span className="animate-pulse" style={{ color: 'var(--warning)' }}>⏳</span>
              )}
            </div>
          </div>

          {/* Share buttons (host only) */}
          {isHost && !room?.player2_id && (
            <>
              <ShareButtons roomCode={roomCode} />
              <Link
                href="/play"
                className="block w-full text-center py-3 rounded-xl font-medium transition-smooth mt-4"
                style={{ background: 'var(--brand-blue)', color: '#FFFFFF', border: 'none', boxShadow: '0 2px 4px rgba(77, 101, 255, 0.15)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(4px)';
                  e.currentTarget.style.background = 'var(--brand-blue-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'var(--brand-blue)';
                }}
              >
                בינתיים, שחק משחק יחיד
              </Link>
              <p className="text-center text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                כשמישהו יצטרף, תקבל התראה
              </p>
            </>
          )}

          {/* Start button (host only, when both players connected) */}
          {isHost && room?.player2_id && (
            <button
              onClick={handleStartGame}
              className="w-full py-4 rounded-xl text-xl font-medium transition-smooth mt-4"
              style={{ background: 'var(--brand-blue)', color: '#FFFFFF', border: 'none', boxShadow: '0 2px 4px rgba(77, 101, 255, 0.15)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(4px)';
                e.currentTarget.style.background = 'var(--brand-blue-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--brand-blue)';
              }}
            >
              התחל משחק!
            </button>
          )}

          {/* Waiting message for player 2 */}
          {isPlayer2 && (
            <div className="text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
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
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--background-primary)' }}>
        <div className="text-center">
          <h2 className="text-2xl mb-8 font-medium" style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>מתחילים!</h2>
          <div className="text-9xl font-semibold animate-countdownPulse" style={{ color: 'var(--text-primary)' }}>
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
      <div className="min-h-screen flex items-center justify-center p-4 animate-fadeIn" style={{ background: 'var(--background-primary)' }}>
        <div className="max-w-md w-full rounded-xl p-8 text-center" style={{ background: 'var(--background-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-6xl mb-4">
            {winner ? '🏆' : '🤝'}
          </div>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {winner ? `${winner} ניצח/ה!` : 'תיקו!'}
          </h1>

          <div className="rounded-xl p-6 my-6" style={{ background: 'var(--background-secondary)', border: '1px solid var(--border-light)' }}>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-semibold" style={{ color: 'var(--brand-blue)', letterSpacing: '-0.02em' }}>
                  {room?.player1_score}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{room?.player1_name}</div>
              </div>
              <div className="text-3xl" style={{ color: 'var(--border-medium)' }}>vs</div>
              <div className="text-center">
                <div className="text-2xl font-semibold" style={{ color: 'var(--brand-blue)', letterSpacing: '-0.02em' }}>
                  {room?.player2_score}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{room?.player2_name}</div>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="block w-full py-3 rounded-xl font-medium transition-smooth"
            style={{ background: 'var(--brand-blue)', color: '#FFFFFF', border: 'none', boxShadow: '0 2px 4px rgba(77, 101, 255, 0.15)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)';
              e.currentTarget.style.background = 'var(--brand-blue-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'var(--brand-blue)';
            }}
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-primary)' }}>
        <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>טוען מילה...</div>
      </div>
    );
  }

  const descriptionDifficulty = getDescriptionDifficulty(wordIndex);
  const description = currentWord.descriptions[descriptionDifficulty];

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--background-primary)' }}>
      {/* Correct Answer Popup - shown to both players */}
      {correctAnswerPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--background-card)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="text-2xl font-semibold mb-2" style={{ color: 'var(--success)', letterSpacing: '-0.01em' }}>
              {correctAnswerPopup} - ניחוש נכון!
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>ממשיכים לשאלה הבאה...</div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {/* Timer - Synchronized */}
        <div className="mb-4">
          <div className="flex flex-col items-center gap-2">
            <div className={`text-3xl font-semibold ${
              serverTimeLeft <= 5 ? 'animate-pulse' : ''
            }`} style={{
              color: serverTimeLeft <= 5 ? '#EF4444' : serverTimeLeft <= 10 ? '#F59E0B' : '#4d65ff',
              letterSpacing: '-0.02em'
            }}>
              {String(Math.floor(serverTimeLeft / 60)).padStart(2, '0')}:
              {String(serverTimeLeft % 60).padStart(2, '0')}
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--background-secondary)' }}>
              <div
                className="h-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${(serverTimeLeft / TIME_PER_WORD) * 100}%`,
                  background: serverTimeLeft <= 5 ? '#EF4444' : serverTimeLeft <= 10 ? '#F59E0B' : '#4d65ff'
                }}
              />
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="flex justify-between rounded-xl p-4 mb-4" style={{ background: 'var(--background-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
          <div className="text-center">
            <div className="text-xl font-semibold" style={{
              color: isHost ? 'var(--brand-blue)' : 'var(--text-secondary)',
              letterSpacing: '-0.02em'
            }}>
              {room?.player1_score}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {room?.player1_name} {isHost && '(את)'}
            </div>
          </div>
          <div className="self-center" style={{ color: 'var(--border-medium)' }}>vs</div>
          <div className="text-center">
            <div className="text-xl font-semibold" style={{
              color: isPlayer2 ? 'var(--brand-blue)' : 'var(--text-secondary)',
              letterSpacing: '-0.02em'
            }}>
              {room?.player2_score}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {room?.player2_name} {isPlayer2 && '(את)'}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
          מילה {wordIndex + 1} מתוך {TOTAL_WORDS}
        </div>

        {/* Word Description */}
        <div className="rounded-xl p-6 mb-4" style={{ background: 'var(--background-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
          <p className="text-xl leading-relaxed text-center" style={{ color: 'var(--text-primary)' }}>
            "{description}"
          </p>
        </div>

        {/* Hints Section */}
        <div className="mb-4">
          {hintsUsed.length > 0 && (
            <div className="rounded-xl p-4 mb-2" style={{ background: '#FFF9E6', border: '1px solid #FFE5A3' }}>
              {hintsUsed.map((hint, idx) => (
                <div key={idx} className="text-sm" style={{ color: '#92400E' }}>
                  רמז {idx + 1}: {hint}
                </div>
              ))}
            </div>
          )}
          {!wordAnswered && hintsUsed.length < availableHints.length && (
            <button
              onClick={handleUseHint}
              className="w-full py-2 rounded-xl text-sm font-medium transition-smooth"
              style={{ background: '#FFF9E6', border: '1px solid #FFE5A3', color: '#92400E' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFF5CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFF9E6';
              }}
            >
              רמז ({hintsUsed.length + 1}/{availableHints.length})
            </button>
          )}
        </div>

        {/* Answer revealed */}
        {wordAnswered && (
          <div className="p-4 rounded-xl text-center font-medium mb-4" style={{ background: 'var(--success)', color: '#FFFFFF', border: '1px solid #059669' }}>
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
                className="flex-1 px-4 py-3 text-lg rounded-xl focus:outline-none transition-smooth"
                style={{ background: 'var(--background-secondary)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(77, 101, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                autoFocus
                dir="rtl"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-medium transition-smooth"
                style={{ background: 'var(--brand-blue)', color: '#FFFFFF', border: 'none', boxShadow: '0 2px 4px rgba(77, 101, 255, 0.15)' }}
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

        {/* Attempts List */}
        <div className="rounded-xl p-4" style={{ background: 'var(--background-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>ניסיונות:</h3>
          {otherTyping && (
            <div className="text-sm mb-2 animate-pulse" style={{ color: 'var(--text-muted)' }}>
              השחקן השני מקליד...
            </div>
          )}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {attempts.length === 0 && !otherTyping && (
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>אין ניסיונות עדיין</div>
            )}
            {attempts.map((attempt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded"
                style={{
                  background: attempt.is_correct ? '#D1FAE5' : 'var(--background-secondary)'
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>
                  {attempt.player_name}: "{attempt.attempt}"
                </span>
                <span>
                  {attempt.is_correct ? (
                    <span style={{ color: 'var(--success)' }}>✓ נכון!</span>
                  ) : (
                    <span style={{ color: 'var(--error)' }}>✗</span>
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
