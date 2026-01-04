'use client';

interface ScoreBoardProps {
  score: number;
  correctAnswers: number;
  hintsUsed: number;
}

export default function ScoreBoard({ score, correctAnswers, hintsUsed }: ScoreBoardProps) {
  return (
    <div className="flex justify-center gap-6 bg-white rounded-xl p-4 shadow-sm">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{score}</div>
        <div className="text-sm text-gray-500">ניקוד</div>
      </div>
      <div className="w-px bg-gray-200" />
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
        <div className="text-sm text-gray-500">נכונות</div>
      </div>
      <div className="w-px bg-gray-200" />
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-500">{hintsUsed}</div>
        <div className="text-sm text-gray-500">רמזים</div>
      </div>
    </div>
  );
}
