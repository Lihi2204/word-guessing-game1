'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, getPlayerId } from '@/lib/supabase';

interface PendingRoom {
  code: string;
  player2_name: string;
}

export default function DuelNotification() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingRoom, setPendingRoom] = useState<PendingRoom | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show notification if already in the room page
    if (pathname?.startsWith('/room/')) {
      setIsVisible(false);
      return;
    }

    const checkPendingRoom = async () => {
      const pendingRoomCode = localStorage.getItem('pendingRoomCode');
      if (!pendingRoomCode) {
        setIsVisible(false);
        return;
      }

      const playerId = getPlayerId();

      const { data: room } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', pendingRoomCode)
        .single();

      if (!room) {
        // Room doesn't exist anymore
        localStorage.removeItem('pendingRoomCode');
        setIsVisible(false);
        return;
      }

      // Check if this user is the host
      if (room.player1_id !== playerId) {
        localStorage.removeItem('pendingRoomCode');
        setIsVisible(false);
        return;
      }

      // Check if game already started or finished
      if (room.status !== 'waiting') {
        localStorage.removeItem('pendingRoomCode');
        setIsVisible(false);
        return;
      }

      // Check if player2 joined
      if (room.player2_id && room.player2_name) {
        setPendingRoom({
          code: pendingRoomCode,
          player2_name: room.player2_name,
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    checkPendingRoom();
    const interval = setInterval(checkPendingRoom, 3000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleStartDuel = () => {
    if (pendingRoom) {
      localStorage.removeItem('pendingRoomCode');
      router.push(`/room/${pendingRoom.code}`);
    }
  };

  const handleDismiss = () => {
    localStorage.removeItem('pendingRoomCode');
    setIsVisible(false);
  };

  if (!isVisible || !pendingRoom) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center animate-bounce-once">
        <div className="text-5xl mb-4">⚔️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {pendingRoom.player2_name} מחכה לך!
        </h2>
        <p className="text-gray-600 mb-6">
          השחקן הצטרף לחדר הדו קרב שלך
        </p>
        <div className="space-y-3">
          <button
            onClick={handleStartDuel}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-lg transition-colors"
          >
            התחל דו קרב!
          </button>
          <button
            onClick={handleDismiss}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-xl transition-colors"
          >
            אחר כך
          </button>
        </div>
      </div>
    </div>
  );
}
