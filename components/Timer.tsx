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
    if (timeLeft <= 5) return 'text-red-500 animate-pulse';
    if (timeLeft <= 10) return 'text-orange-500';
    return 'text-blue-600';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = (timeLeft / duration) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-3xl font-bold ${getTimerColor()}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
