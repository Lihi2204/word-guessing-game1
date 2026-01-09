'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getPlayerId, generateRoomCode } from '@/lib/supabase';
import { selectWordsForGame } from '@/lib/game-logic';

export default function MultiplayerPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('נא להזין שם');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const playerId = getPlayerId();
      const roomCode = generateRoomCode();
      const words = await selectWordsForGame(30);
      const wordsOrder = words.map(w => w.word);

      const { data, error: dbError } = await supabase
        .from('game_rooms')
        .insert({
          code: roomCode,
          player1_id: playerId,
          player1_name: playerName.trim(),
          words_order: wordsOrder,
          status: 'waiting',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Save player name for future use
      localStorage.setItem('playerName', playerName.trim());
      // Save pending room code for global notification
      localStorage.setItem('pendingRoomCode', roomCode);

      router.push(`/room/${roomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('שגיאה ביצירת החדר. נסה שוב.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('נא להזין שם');
      return;
    }
    if (!joinCode.trim()) {
      setError('נא להזין קוד חדר');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const playerId = getPlayerId();
      const code = joinCode.trim().toUpperCase();

      // Check if room exists
      const { data: room, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError || !room) {
        setError('חדר לא נמצא');
        return;
      }

      if (room.status !== 'waiting') {
        setError('המשחק כבר התחיל');
        return;
      }

      if (room.player2_id) {
        setError('החדר מלא');
        return;
      }

      // Join the room
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          player2_id: playerId,
          player2_name: playerName.trim(),
        })
        .eq('code', code);

      if (updateError) throw updateError;

      localStorage.setItem('playerName', playerName.trim());
      router.push(`/room/${code}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setError('שגיאה בהצטרפות לחדר');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fadeIn" style={{ background: 'var(--background-primary)' }}>
      <div className="max-w-md w-full">
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

        <h1 className="text-3xl font-semibold mb-8 text-center" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          לשחק נגד חברים
        </h1>

        {/* Error Message */}
        {error && (
          <div
            className="p-4 rounded-xl mb-4 text-center animate-fadeIn"
            style={{
              background: 'var(--error)',
              color: '#2D2D2D',
              border: '1px solid #FF9FA5'
            }}
          >
            {error}
          </div>
        )}

        {/* Player Name Input */}
        <div
          className="rounded-2xl p-6 mb-6 transition-smooth"
          style={{
            background: 'var(--background-card)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <label className="block font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            השם שלך
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="הכנס את השם שלך..."
            className="w-full px-4 py-3 rounded-xl focus:outline-none transition-smooth"
            style={{
              background: 'var(--background-secondary)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)'
            }}
            dir="rtl"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.02)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-light)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Create Room Section */}
        <div
          className="rounded-2xl p-6 mb-4 transition-smooth"
          style={{
            background: 'var(--background-card)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>צור חדר חדש</h2>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full py-3 rounded-xl font-medium transition-smooth"
            style={{
              background: isCreating ? 'var(--background-secondary)' : 'var(--success)',
              border: `1px solid ${isCreating ? 'var(--border-light)' : '#8CD4B2'}`,
              color: isCreating ? 'var(--text-muted)' : '#2D2D2D',
              cursor: isCreating ? 'not-allowed' : 'pointer'
            }}
          >
            {isCreating ? 'יוצר חדר...' : 'צור חדר'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border-medium)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>או</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-medium)' }} />
        </div>

        {/* Join Room Section */}
        <div
          className="rounded-2xl p-6 transition-smooth"
          style={{
            background: 'var(--background-card)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <h2 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>הצטרף לחדר קיים</h2>
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="הכנס קוד חדר..."
              className="w-full px-4 py-3 rounded-xl focus:outline-none mb-3 text-center tracking-widest text-lg transition-smooth"
              style={{
                background: 'var(--background-secondary)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)'
              }}
              maxLength={5}
              dir="ltr"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-medium)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.02)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-3 rounded-xl font-medium transition-smooth"
              style={{
                background: isJoining ? 'var(--background-secondary)' : 'var(--background-card)',
                border: isJoining ? '1px solid var(--border-light)' : '2px solid var(--border-medium)',
                color: isJoining ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: isJoining ? 'not-allowed' : 'pointer',
                boxShadow: isJoining ? 'none' : 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                if (!isJoining) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isJoining) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }
              }}
            >
              {isJoining ? 'מצטרף...' : 'הצטרף לחדר'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
