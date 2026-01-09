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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fadeIn home-background">
      <main className="max-w-md w-full text-center">
        {/* Logo/Title */}
        <div className="mb-16">
          <h1 className="text-5xl font-semibold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            נחשו את המילה
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            קראו את התיאור ונחשו את המילה
          </p>
        </div>

        {/* High Score */}
        {highScore !== null && (
          <div
            className="mb-12 rounded-xl p-5 transition-smooth glass-card"
            style={{
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              <span className="text-2xl ml-2">🏆</span>
              השיא שלך: <span className="font-semibold text-2xl" style={{ color: 'var(--text-primary)' }}>{highScore}</span> נקודות
            </p>
          </div>
        )}

        {/* Game Modes - Vicarius Style Buttons */}
        <div className="space-y-3">
          <Link
            href="/play"
            className="block w-full text-xl font-medium py-5 px-6 rounded-xl transition-smooth"
            style={{
              background: 'var(--brand-blue)',
              color: '#FFFFFF',
              border: 'none',
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
            משחק יחיד
          </Link>

          <Link
            href="/multiplayer"
            className="block w-full text-xl font-medium py-5 px-6 rounded-xl transition-smooth glass-card"
            style={{
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.background = 'rgba(243, 244, 246, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            }}
          >
            דו קרב
          </Link>
        </div>

        {/* Instructions - Minimalist Card */}
        <div
          className="mt-16 rounded-xl p-8 text-right transition-smooth glass-card"
          style={{
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <h2 className="text-lg font-medium mb-5" style={{ color: 'var(--text-primary)' }}>
            איך משחקים?
          </h2>
          <ul className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--text-primary)' }}></span>
              <span>קראו את התיאור שמופיע על המסך</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--text-primary)' }}></span>
              <span>נסו לנחש איזו מילה מתוארת</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--text-primary)' }}></span>
              <span>יש לכם 20 שניות לכל מילה</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--text-primary)' }}></span>
              <span>אפשר להשתמש ברמזים אם נתקעתם</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
