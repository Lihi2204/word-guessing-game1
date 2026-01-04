export interface Word {
  word: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  descriptions: {
    easy: string;
    medium: string;
    hard: string;
  };
  hint: string;
  synonyms: string[];
}

export interface Category {
  id: string;
  name: string;
}

export interface GameState {
  currentWordIndex: number;
  score: number;
  hintsUsed: number;
  correctAnswers: number;
  words: Word[];
  gameStatus: 'countdown' | 'playing' | 'finished';
  currentHintIndex: number;
}

export interface GameRoom {
  id: string;
  code: string;
  status: 'waiting' | 'playing' | 'finished';
  player1_id: string;
  player1_name: string;
  player2_id?: string;
  player2_name?: string;
  player1_score: number;
  player2_score: number;
  current_word_index: number;
  words_order: string[];
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface GameAttempt {
  id: string;
  room_id: string;
  player_id: string;
  word_id: string;
  attempt: string;
  is_correct: boolean;
  attempt_time: string;
}
