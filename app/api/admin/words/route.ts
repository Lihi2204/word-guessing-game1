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

// GET - Get all words
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = readWordsFile();
    return NextResponse.json(data);
  } catch {
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
    const data = readWordsFile();

    // Check if word already exists
    const allWords = [...data.words.easy, ...data.words.medium, ...data.words.hard];
    if (allWords.some((w: any) => w.word === word.word)) {
      return NextResponse.json({ error: 'המילה כבר קיימת' }, { status: 400 });
    }

    // Add word to appropriate difficulty level
    data.words[difficulty].push(word);
    data.metadata.totalWords = data.words.easy.length + data.words.medium.length + data.words.hard.length;

    writeWordsFile(data);
    return NextResponse.json({ success: true, word });
  } catch {
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
    const data = readWordsFile();

    // Remove from original difficulty
    const originalIndex = data.words[originalDifficulty].findIndex((w: any) => w.word === originalWord);
    if (originalIndex === -1) {
      return NextResponse.json({ error: 'המילה לא נמצאה' }, { status: 404 });
    }

    data.words[originalDifficulty].splice(originalIndex, 1);

    // Add to new difficulty (or same)
    data.words[newDifficulty].push(updatedWord);

    writeWordsFile(data);
    return NextResponse.json({ success: true, word: updatedWord });
  } catch {
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
    const data = readWordsFile();

    const index = data.words[difficulty].findIndex((w: any) => w.word === word);
    if (index === -1) {
      return NextResponse.json({ error: 'המילה לא נמצאה' }, { status: 404 });
    }

    data.words[difficulty].splice(index, 1);
    data.metadata.totalWords = data.words.easy.length + data.words.medium.length + data.words.hard.length;

    writeWordsFile(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 });
  }
}
