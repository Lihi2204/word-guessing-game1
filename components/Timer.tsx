'use client';

import { useEffect, useState, useCallback } from 'react';

interface TimerProps {
  duration: number;
  onTimeUp: () => void;
  isRunning: boolean;
  resetKey: number;
}

export default function Timer({ duration, onTimeUp, isRunning, resetKey }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [resetKey, duration]);

  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onTimeUp]);

  const getTimerColor = () => {
    if (timeLeft <= 5) return { color: 'var(--error)', animate: true };
    if (timeLeft <= 10) return { color: 'var(--warning)', animate: false };
    return { color: 'var(--text-primary)', animate: false };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = (timeLeft / duration) * 100;
  const timerStyle = getTimerColor();

  const getBarColor = () => {
    if (timeLeft <= 5) return 'var(--error)';
    if (timeLeft <= 10) return 'var(--warning)';
    return 'var(--text-primary)';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`text-4xl font-semibold ${timerStyle.animate ? 'animate-pulse' : ''}`}
        style={{ color: timerStyle.color, letterSpacing: '-0.02em' }}
      >
        {formatTime(timeLeft)}
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--background-secondary)' }}
      >
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{ width: `${percentage}%`, background: getBarColor() }}
        />
      </div>
    </div>
  );
}
