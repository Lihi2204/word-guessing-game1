-- Supabase Schema for Word Guessing Game
-- Run this in your Supabase SQL Editor

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_hebrew TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Words table
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  description_easy TEXT NOT NULL,
  description_medium TEXT NOT NULL,
  description_hard TEXT NOT NULL,
  hints TEXT[] DEFAULT '{}',
  synonyms TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game rooms table (for multiplayer)
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  player1_id TEXT,
  player1_name TEXT,
  player2_id TEXT,
  player2_name TEXT,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  current_word_index INTEGER DEFAULT 0,
  words_order UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Game attempts table
CREATE TABLE IF NOT EXISTS game_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  word_index INTEGER NOT NULL,
  attempt TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Single player games table
CREATE TABLE IF NOT EXISTS single_player_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT,
  score INTEGER DEFAULT 0,
  words_completed INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for game_rooms (allow all for anonymous users)
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms
  FOR ALL USING (true) WITH CHECK (true);

-- Policies for game_attempts
CREATE POLICY "Allow all operations on game_attempts" ON game_attempts
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for game_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_attempts;

-- Create index for faster room lookup by code
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
