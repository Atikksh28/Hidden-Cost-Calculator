'use client'

import { Button } from '@/components/ui/button'

// Deliberately shows nothing technical: no message, stack or digest.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
      <p className="text-muted-foreground">Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
