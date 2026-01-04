import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function checkAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password');
  return password === ADMIN_PASSWORD;
}

// GET - Get all words and categories
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (catError) throw catError;

    // Get all words
    const { data: allWords, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .order('word');

    if (wordsError) throw wordsError;

    // Organize words by difficulty
    const words = {
      easy: allWords?.filter(w => w.difficulty === 'easy') || [],
      medium: allWords?.filter(w => w.difficulty === 'medium') || [],
      hard: allWords?.filter(w => w.difficulty === 'hard') || [],
    };

    // Transform to match expected format
    const transformedWords = {
      easy: words.easy.map(w => ({
        word: w.word,
        category: w.category,
        descriptions: {
          easy: w.description_easy,
          medium: w.description_medium,
          hard: w.description_hard,
        },
        hint: w.hint,
        synonyms: w.synonyms || [],
      })),
      medium: words.medium.map(w => ({
        word: w.word,
        category: w.category,
        descriptions: {
          easy: w.description_easy,
          medium: w.description_medium,
          hard: w.description_hard,
        },
        hint: w.hint,
        synonyms: w.synonyms || [],
      })),
      hard: words.hard.map(w => ({
        word: w.word,
        category: w.category,
        descriptions: {
          easy: w.description_easy,
          medium: w.description_medium,
          hard: w.description_hard,
        },
        hint: w.hint,
        synonyms: w.synonyms || [],
      })),
    };

    return NextResponse.json({
      metadata: {
        totalWords: allWords?.length || 0,
        categories: categories?.length || 0,
      },
      categories: categories || [],
      words: transformedWords,
    });
  } catch (error) {
    console.error('Error fetching words:', error);
    return NextResponse.json({ error: 'Failed to read words' }, { status: 500 });
  }
}

// POST - Add new word
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { word, difficulty } = await request.json();

    const { error } = await supabase
      .from('words')
      .insert({
        word: word.word,
        category: word.category,
        difficulty: difficulty,
        description_easy: word.descriptions.easy,
        description_medium: word.descriptions.medium,
        description_hard: word.descriptions.hard,
        hint: word.hint,
        synonyms: word.synonyms || [],
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'המילה כבר קיימת' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, word });
  } catch (error) {
    console.error('Error adding word:', error);
    return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
  }
}

// PUT - Update word
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { originalWord, originalDifficulty, updatedWord, newDifficulty } = await request.json();

    // Delete old word
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .eq('word', originalWord)
      .eq('difficulty', originalDifficulty);

    if (deleteError) throw deleteError;

    // Insert updated word
    const { error: insertError } = await supabase
      .from('words')
      .insert({
        word: updatedWord.word,
        category: updatedWord.category,
        difficulty: newDifficulty,
        description_easy: updatedWord.descriptions.easy,
        description_medium: updatedWord.descriptions.medium,
        description_hard: updatedWord.descriptions.hard,
        hint: updatedWord.hint,
        synonyms: updatedWord.synonyms || [],
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, word: updatedWord });
  } catch (error) {
    console.error('Error updating word:', error);
    return NextResponse.json({ error: 'Failed to update word' }, { status: 500 });
  }
}

// DELETE - Delete word
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { word, difficulty } = await request.json();

    const { error } = await supabase
      .from('words')
      .delete()
      .eq('word', word)
      .eq('difficulty', difficulty);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting word:', error);
    return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 });
  }
}
