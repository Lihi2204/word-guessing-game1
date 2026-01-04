import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import wordsData from '@/data/words.json';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Migrate all words from JSON to Supabase
export async function POST(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = wordsData as any;
    let categoriesInserted = 0;
    let wordsInserted = 0;
    const errors: string[] = [];

    // First check if tables exist by trying a simple select
    const { error: tableCheckError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      return NextResponse.json({
        error: `Database error: ${tableCheckError.message}. Make sure to run the SQL schema in Supabase first.`,
        code: tableCheckError.code
      }, { status: 500 });
    }

    // Insert categories first (words depend on them)
    for (const category of data.categories) {
      const { error } = await supabase
        .from('categories')
        .upsert({ id: category.id, name: category.name }, { onConflict: 'id' });

      if (error) {
        errors.push(`Category ${category.id}: ${error.message}`);
      } else {
        categoriesInserted++;
      }
    }

    // If no categories were inserted and there were errors, stop
    if (categoriesInserted === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert categories',
        details: errors,
      }, { status: 500 });
    }

    // Insert words
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (const word of data.words[difficulty]) {
        const { error } = await supabase
          .from('words')
          .upsert({
            word: word.word,
            category: word.category,
            difficulty: difficulty,
            description_easy: word.descriptions.easy,
            description_medium: word.descriptions.medium,
            description_hard: word.descriptions.hard,
            hint: word.hint,
            synonyms: word.synonyms || [],
          }, { onConflict: 'word,difficulty' });

        if (error) {
          errors.push(`Word ${word.word}: ${error.message}`);
        } else {
          wordsInserted++;
        }
      }
    }

    return NextResponse.json({
      success: wordsInserted > 0,
      categoriesInserted,
      wordsInserted,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors shown
      totalErrors: errors.length,
    });
  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Migration failed: ${errorMessage}` }, { status: 500 });
  }
}
