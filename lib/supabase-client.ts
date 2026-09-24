import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Single browser Supabase client for the whole app — this is a client-only
 * app (no server components/actions touch Supabase), so a plain
 * @supabase/supabase-js client is enough; no need for @supabase/ssr.
 *
 * `null` when the env vars aren't set, rather than throwing — login is
 * optional, so a missing/unconfigured Supabase project must never break the
 * app for guests. Every call site treats `supabase === null` the same as
 * "not logged in, use localStorage."
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

if (!supabase && typeof window !== 'undefined') {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — cloud save/Google sign-in disabled, running in guest-only (localStorage) mode.'
  )
}
