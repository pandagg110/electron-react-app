const VITE_SUPABASE_URL="https://xhfljjpfjwbixxbfummv.supabase.co"
const VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZmxqanBmandiaXh4YmZ1bW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MzU5NjUsImV4cCI6MjA2NTIxMTk2NX0.XQu4Qltt8i4VvPhWmrvk5HypnCEFTAVUNd4MOJk1vwA"
const VITE_BATTLE_SESSION_ID="BIANLIDIAN_S1"

export const env = {
  supabaseUrl: VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: VITE_SUPABASE_ANON_KEY ?? '',
  defaultSessionId: VITE_BATTLE_SESSION_ID ?? 'default-session',
}

export const isSupabaseConfigured = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey)
