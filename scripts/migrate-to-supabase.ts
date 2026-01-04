// Run this script to migrate words from JSON to Supabase
// Usage: npx ts-node scripts/migrate-to-supabase.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Need service role key for migration

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  // Read words.json
  const wordsPath = path.join(__dirname, '..', 'data', 'words.json');
  const data = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));

  console.log('Starting migration...');
  console.log(`Found ${data.categories.length} categories`);
  console.log(`Found ${data.metadata.totalWords} words`);

  // Insert categories
  console.log('\nInserting categories...');
  for (const category of data.categories) {
    const { error } = await supabase
      .from('categories')
      .upsert({ id: category.id, name: category.name });

    if (error) {
      console.error(`Error inserting category ${category.id}:`, error);
    } else {
      console.log(`✓ Category: ${category.name}`);
    }
  }

  // Insert words
  console.log('\nInserting words...');
  let count = 0;

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
        }, {
          onConflict: 'word,difficulty'
        });

      if (error) {
        console.error(`Error inserting word ${word.word}:`, error);
      } else {
        count++;
        if (count % 50 === 0) {
          console.log(`✓ Inserted ${count} words...`);
        }
      }
    }
  }

  console.log(`\n✓ Migration complete! Inserted ${count} words.`);
}

migrate().catch(console.error);
