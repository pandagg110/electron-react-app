import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

let client: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient | null => {
  if (client) {
    return client
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null
  }

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })

  return client
}
