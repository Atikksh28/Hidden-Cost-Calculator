'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { buildBookmarkletCode, buildBookmarkletHref } from '@/lib/bookmarklet'

/** "Faster way" section for the Paste Listing tab: a draggable bookmarklet link + copy-code fallback. */
export function BookmarkletHelper() {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const [copied, setCopied] = useState(false)

  // React blocks/warns on javascript: URLs in JSX href, so it's set imperatively. The origin is read
  // at render time, never hardcoded, so the same build works on localhost and in production.
  useEffect(() => {
    linkRef.current?.setAttribute('href', buildBookmarkletHref(window.location.origin))
  }, [])

  const copyCode = async () => {
    const code = buildBookmarkletCode(window.location.origin)
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: nothing else to do; the draggable link is the main path.
    }
  }

  return (
    <details className="rounded-lg border border-border bg-card/50 text-sm">
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-foreground">Faster way</summary>
      <div className="space-y-3 px-3 pb-3 text-muted-foreground">
        <p>
          <a
            ref={linkRef}
            draggable
            onClick={(e) => e.preventDefault()}
            className="inline-block rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground cursor-grab"
          >
            Send to Hidden Cost Calculator
          </a>
          <span className="ml-2 text-xs">Drag this to your bookmarks bar. Don&apos;t click it here.</span>
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Drag the button above to your bookmarks bar.</li>
          <li>Open a listing page.</li>
          <li>Click the bookmark. The text lands here, ready to review.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyCode}>
            {copied ? 'Copied' : 'Copy code'}
          </Button>
          <span className="text-xs">Can&apos;t drag? Create a bookmark manually and paste this code as its URL.</span>
        </div>
        <p className="text-xs">
          Tip: select the listing details first for the best results. Phones may not support bookmarklets; pasting
          still works.
        </p>
      </div>
    </details>
  )
}
