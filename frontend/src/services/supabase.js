import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock mode.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

// Log Supabase config for debugging (only in dev)
if (import.meta.env.DEV && supabase) {
  console.log('Supabase client initialized:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    anonKeyLength: supabaseAnonKey?.length,
    anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
  })
  
  // Verify the anon key format (should start with eyJ)
  if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
    console.warn('⚠️ Supabase anon key does not appear to be a valid JWT token')
  }
}

