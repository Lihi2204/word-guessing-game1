'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [highScore, setHighScore] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wordGameHighScore');
    if (saved) {
      setHighScore(parseInt(saved));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <main className="max-w-md w-full text-center">
        {/* Logo/Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-blue-600 mb-2">
            נחש מילה
          </h1>
          <p className="text-gray-600 text-lg">
            קראו את התיאור ונחשו את המילה!
          </p>
        </div>

        {/* High Score */}
        {highScore !== null && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-yellow-700">
              <span className="text-2xl ml-2">🏆</span>
              השיא שלך: <span className="font-bold text-xl">{highScore}</span> נקודות
            </p>
          </div>
        )}

        {/* Game Modes */}
        <div className="space-y-4">
          <Link
            href="/play"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            משחק יחיד
          </Link>

          <Link
            href="/multiplayer"
            className="block w-full bg-green-500 hover:bg-green-600 text-white text-xl font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            דו קרב
          </Link>
        </div>

        {/* Instructions */}
        <div className="mt-10 bg-white rounded-xl p-6 shadow-md text-right">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">איך משחקים?</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">●</span>
              <span>קראו את התיאור שמופיע על המסך</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">●</span>
              <span>נסו לנחש איזו מילה מתוארת</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">●</span>
              <span>יש לכם 30 שניות לכל מילה</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">●</span>
              <span>אפשר להשתמש ברמזים אם נתקעתם</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
