import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

// GET - Get all words for the game
export async function GET() {
  try {
    // Fetch all words from Supabase
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*');

    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 });
    }

    // Fetch all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    // Transform data to match the game-logic expectations
    const easyWords = words
      .filter(w => w.difficulty === 'easy')
      .map(w => ({
        word: w.word,
        category: w.category,
        descriptions: {
          easy: w.description_easy,
          medium: w.description_medium,
          hard: w.description_hard,
        },
        hint: w.hint,
        synonyms: w.synonyms || [],
      }));

    const mediumWords = words
      .filter(w => w.difficulty === 'medium')
      .map(w => ({
        word: w.word,
        category: w.category,
        descriptions: {
          easy: w.description_easy,
          medium: w.description_medium,
          hard: w.description_hard,
        },
        hint: w.hint,
        synonyms: w.synonyms || [],
      }));

    const hardWords = words
      .filter(w => w.difficulty === 'hard')
      .map(w => ({
        word: w.word,
        category: w.category,
        descriptions: {
          easy: w.description_easy,
          medium: w.description_medium,
          hard: w.description_hard,
        },
        hint: w.hint,
        synonyms: w.synonyms || [],
      }));

    const response = {
      metadata: {
        totalWords: words.length,
        categories: categories.length,
        difficultiesPerWord: 3,
      },
      categories: categories.map(c => ({ id: c.id, name: c.name })),
      words: {
        easy: easyWords,
        medium: mediumWords,
        hard: hardWords,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
