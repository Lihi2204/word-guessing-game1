'use client';

import { useState } from 'react';

interface ShareButtonsProps {
  roomCode: string;
}

export default function ShareButtons({ roomCode }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomCode}`
    : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleWhatsApp = () => {
    const text = `בוא/י לשחק איתי במשחק ניחוש מילים! 🎯\n${roomUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Room Code Display */}
      <div className="bg-gray-100 rounded-xl p-4 text-center">
        <div className="text-sm text-gray-500 mb-1">קוד החדר</div>
        <div className="text-3xl font-bold tracking-widest text-gray-800">{roomCode}</div>
      </div>

      {/* Room Link */}
      <div className="bg-gray-50 rounded-xl p-3 text-center">
        <div className="text-sm text-gray-500 mb-1">קישור</div>
        <div className="text-sm text-blue-600 break-all" dir="ltr">{roomUrl}</div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {copied ? '✓ הועתק!' : 'העתק קישור'}
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
        >
          שתף בווטסאפ
        </button>
      </div>
    </div>
  );
}
