'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  onComplete: () => void;
}

export default function Countdown({ onComplete }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--background-primary)' }}
    >
      <div className="text-center">
        <h2
          className="text-2xl mb-8 font-medium"
          style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}
        >
          מתחילים!
        </h2>
        <div
          className="text-9xl font-semibold animate-countdownPulse"
          style={{ color: 'var(--text-primary)' }}
        >
          {count === 0 ? '!' : count}
        </div>
      </div>
    </div>
  );
}
