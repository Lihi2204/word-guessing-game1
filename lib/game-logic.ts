import { Word } from './types';

interface WordsDataStructure {
  metadata: {
    totalWords: number;
    categories: number;
    difficultiesPerWord: number;
  };
  categories: { id: string; name: string }[];
  words: {
    easy: Omit<Word, 'difficulty'>[];
    medium: Omit<Word, 'difficulty'>[];
    hard: Omit<Word, 'difficulty'>[];
  };
}

// Cache for words data
let cachedWordsData: WordsDataStructure | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch words from API
async function fetchWordsData(): Promise<WordsDataStructure> {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedWordsData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedWordsData;
  }

  try {
    const response = await fetch('/api/words', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch words: ${response.statusText}`);
    }

    const data = await response.json();
    cachedWordsData = data;
    cacheTimestamp = now;
    return data;
  } catch (error) {
    console.error('Error fetching words:', error);
    // Fallback to empty data structure if fetch fails
    return {
      metadata: { totalWords: 0, categories: 0, difficultiesPerWord: 3 },
      categories: [],
      words: { easy: [], medium: [], hard: [] },
    };
  }
}

export function normalizeHebrew(text: string): string {
  return text
    .replace(/[״"]/g, '"')
    .replace(/[׳']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

export function checkAnswer(userAnswer: string, correctWord: string, synonyms: string[] = []): boolean {
  const normalized = normalizeHebrew(userAnswer);
  const correctNormalized = normalizeHebrew(correctWord);

  // Exact match
  if (normalized === correctNormalized) {
    return true;
  }

  // Check with typo tolerance (1 character difference)
  if (levenshteinDistance(normalized, correctNormalized) <= 1) {
    return true;
  }

  // Check synonyms
  for (const synonym of synonyms) {
    const synonymNormalized = normalizeHebrew(synonym);
    if (normalized === synonymNormalized || levenshteinDistance(normalized, synonymNormalized) <= 1) {
      return true;
    }
  }

  return false;
}

export async function getAllWordsForLookup(): Promise<Word[]> {
  return getAllWords();
}

async function getAllWords(): Promise<Word[]> {
  const wordsData = await fetchWordsData();
  const allWords: Word[] = [];

  // Add easy words
  wordsData.words.easy.forEach((w) => {
    allWords.push({ ...w, difficulty: 'easy' });
  });

  // Add medium words
  wordsData.words.medium.forEach((w) => {
    allWords.push({ ...w, difficulty: 'medium' });
  });

  // Add hard words
  wordsData.words.hard.forEach((w) => {
    allWords.push({ ...w, difficulty: 'hard' });
  });

  return allWords;
}

export async function selectWordsForGame(totalWords: number = 30): Promise<Word[]> {
  const allWords = await getAllWords();
  const selectedWords: Word[] = [];
  const usedWords = new Set<string>();

  // Split into difficulty groups
  const easyWords = allWords.filter(w => w.difficulty === 'easy');
  const mediumWords = allWords.filter(w => w.difficulty === 'medium');
  const hardWords = allWords.filter(w => w.difficulty === 'hard');

  const selectFromPool = (pool: Word[], count: number): Word[] => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected: Word[] = [];

    for (const word of shuffled) {
      if (selected.length >= count) break;
      if (!usedWords.has(word.word)) {
        selected.push(word);
        usedWords.add(word.word);
      }
    }

    return selected;
  };

  // Select words for each difficulty level
  // Words 1-10: easy, Words 11-20: medium, Words 21-30: hard
  const easyCount = Math.min(10, Math.ceil(totalWords / 3));
  const mediumCount = Math.min(10, Math.ceil(totalWords / 3));
  const hardCount = totalWords - easyCount - mediumCount;

  const easySelection = selectFromPool(easyWords, easyCount);
  const mediumSelection = selectFromPool(mediumWords, mediumCount);
  const hardSelection = selectFromPool(hardWords, hardCount);

  // Combine in order
  selectedWords.push(...easySelection, ...mediumSelection, ...hardSelection);

  // If we don't have enough words, fill from any pool
  while (selectedWords.length < totalWords) {
    const remainingWords = allWords.filter(w => !usedWords.has(w.word));
    if (remainingWords.length === 0) break;

    const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
    selectedWords.push(randomWord);
    usedWords.add(randomWord.word);
  }

  return selectedWords.slice(0, totalWords);
}

export function getDescriptionDifficulty(wordIndex: number): 'easy' | 'medium' | 'hard' {
  if (wordIndex < 10) return 'easy';
  if (wordIndex < 20) return 'medium';
  return 'hard';
}

export async function getCategoryName(categoryId: string): Promise<string> {
  const wordsData = await fetchWordsData();
  const category = wordsData.categories.find(c => c.id === categoryId);
  return category?.name || categoryId;
}

export function calculateScore(correct: boolean, hintsUsed: number): number {
  if (!correct) return 0;
  return Math.max(0, 10 - (hintsUsed * 3));
}

export function generateHints(word: Word): string[] {
  const hints: string[] = [];

  // Hint 1: Unique hint for the word
  hints.push(word.hint);

  // Hint 2: First letter
  hints.push(`מתחיל באות ${word.word[0]}`);

  return hints;
}
