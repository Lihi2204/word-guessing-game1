import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const WORDS_FILE = path.join(process.cwd(), 'data', 'words.json');

function checkAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password');
  return password === ADMIN_PASSWORD;
}

function readWordsFile() {
  const data = fs.readFileSync(WORDS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeWordsFile(data: any) {
  fs.writeFileSync(WORDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET - Get all categories
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = readWordsFile();
    return NextResponse.json({ categories: data.categories });
  } catch {
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
    const data = readWordsFile();

    // Check if category already exists
    if (data.categories.some((c: any) => c.id === id)) {
      return NextResponse.json({ error: 'הקטגוריה כבר קיימת' }, { status: 400 });
    }

    data.categories.push({ id, name });
    data.metadata.categories = data.categories.length;

    writeWordsFile(data);
    return NextResponse.json({ success: true, category: { id, name } });
  } catch {
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
    const data = readWordsFile();

    const index = data.categories.findIndex((c: any) => c.id === originalId);
    if (index === -1) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    // Update category
    data.categories[index] = { id: newId, name: newName };

    // Update all words with this category
    if (originalId !== newId) {
      ['easy', 'medium', 'hard'].forEach(difficulty => {
        data.words[difficulty].forEach((word: any) => {
          if (word.category === originalId) {
            word.category = newId;
          }
        });
      });
    }

    writeWordsFile(data);
    return NextResponse.json({ success: true, category: { id: newId, name: newName } });
  } catch {
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
    const data = readWordsFile();

    // Check if category has words
    const hasWords = ['easy', 'medium', 'hard'].some(difficulty =>
      data.words[difficulty].some((w: any) => w.category === id)
    );

    if (hasWords) {
      return NextResponse.json({ error: 'לא ניתן למחוק קטגוריה שיש בה מילים' }, { status: 400 });
    }

    const index = data.categories.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'הקטגוריה לא נמצאה' }, { status: 404 });
    }

    data.categories.splice(index, 1);
    data.metadata.categories = data.categories.length;

    writeWordsFile(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
