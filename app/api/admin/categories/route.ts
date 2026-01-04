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

// GET - Get all categories
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to read categories' }, { status: 500 });
  }
}

// POST - Add new category
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, name } = await request.json();

    const { error } = await supabase
      .from('categories')
      .insert({ id, name });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'הקטגוריה כבר קיימת' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, category: { id, name } });
  } catch (error) {
    console.error('Error adding category:', error);
    return NextResponse.json({ error: 'Failed to add category' }, { status: 500 });
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { originalId, newId, newName } = await request.json();

    // If ID is changing, we need to update all words first
    if (originalId !== newId) {
      const { error: wordsError } = await supabase
        .from('words')
        .update({ category: newId })
        .eq('category', originalId);

      if (wordsError) throw wordsError;

      // Delete old category and insert new one
      await supabase.from('categories').delete().eq('id', originalId);
      const { error } = await supabase.from('categories').insert({ id: newId, name: newName });
      if (error) throw error;
    } else {
      // Just update the name
      const { error } = await supabase
        .from('categories')
        .update({ name: newName })
        .eq('id', originalId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, category: { id: newId, name: newName } });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    // Check if category has words
    const { data: words, error: checkError } = await supabase
      .from('words')
      .select('id')
      .eq('category', id)
      .limit(1);

    if (checkError) throw checkError;

    if (words && words.length > 0) {
      return NextResponse.json({ error: 'לא ניתן למחוק קטגוריה שיש בה מילים' }, { status: 400 });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
