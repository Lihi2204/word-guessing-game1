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
      const words = selectWordsForGame(30);
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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6"
        >
          <span className="ml-1">→</span>
          חזרה לדף הבית
        </Link>

        <h1 className="text-3xl font-bold text-green-600 mb-8 text-center">
          לשחק נגד חברים
        </h1>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Player Name Input */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            השם שלך
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="הכנס את השם שלך..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
            dir="rtl"
          />
        </div>

        {/* Create Room Section */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">צור חדר חדש</h2>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {isCreating ? 'יוצר חדר...' : 'צור חדר'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-gray-500">או</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Join Room Section */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">הצטרף לחדר קיים</h2>
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="הכנס קוד חדר..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none mb-3 text-center tracking-widest text-lg"
              maxLength={5}
              dir="ltr"
            />
            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              {isJoining ? 'מצטרף...' : 'הצטרף לחדר'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
