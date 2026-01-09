'use client';

interface ScoreBoardProps {
  score: number;
  correctAnswers: number;
  hintsUsed: number;
}

export default function ScoreBoard({ score, correctAnswers, hintsUsed }: ScoreBoardProps) {
  return (
    <div
      className="flex justify-center gap-8 rounded-xl p-5 transition-smooth"
      style={{
        background: 'var(--background-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-xs)'
      }}
    >
      <div className="text-center">
        <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {score}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>ניקוד</div>
      </div>
      <div className="w-px" style={{ background: 'var(--border-light)' }} />
      <div className="text-center">
        <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {correctAnswers}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>נכונות</div>
      </div>
      <div className="w-px" style={{ background: 'var(--border-light)' }} />
      <div className="text-center">
        <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {hintsUsed}
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>רמזים</div>
      </div>
    </div>
  );
}
