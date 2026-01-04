import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create supabase client - will throw error at runtime if not configured
function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build time
    const mockFn = () => ({
      select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
    });

    return {
      from: mockFn,
      channel: () => ({
        on: function() { return this; },
        send: () => Promise.resolve(),
        subscribe: () => {},
      }),
      removeChannel: () => {},
    } as unknown as SupabaseClient;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Generate a unique player ID for the session
export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';

  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    playerId = 'player_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('playerId', playerId);
  }
  return playerId;
}

// Generate a random room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
