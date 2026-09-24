'use client'

import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, LogIn } from 'lucide-react'

/**
 * Sign in / sign out control. Renders nothing if Supabase isn't configured
 * (no env vars) — login is entirely optional infrastructure, not a required
 * part of the app.
 */
export function AuthWidget() {
  const { user, loading, isSupabaseConfigured, signInWithGoogle, signOut } = useAuth()

  if (!isSupabaseConfigured || loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[10rem]">
          {user.email}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={signInWithGoogle} className="gap-1.5">
      <LogIn className="h-3.5 w-3.5" />
      Sign in with Google
    </Button>
  )
}
