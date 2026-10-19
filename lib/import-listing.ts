/**
 * Bookmarklet import payload. Everything in here is UNTRUSTED: it comes from a URL
 * fragment that anyone can craft. The parser only ever returns a fresh object with
 * four whitelisted string fields; the rest of the app renders them as plain text.
 */
export interface ImportedListing {
  url: string
  title: string
  text: string
}

export const IMPORT_HASH_PREFIX = '#lx='
export const IMPORT_LIMITS = { url: 500, title: 300, text: 8000 } as const
/** A legitimate payload (8,000 chars, worst-case percent-encoded) is well under this; bigger hashes aren't even decoded. */
export const MAX_IMPORT_HASH_LENGTH = 200_000

// C0 controls and DEL, except tab (\x09), newline (\x0A) and carriage return (\x0D), which are normal in page text.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

function clean(value: string, max: number): string {
  let out = value.replace(CONTROL_CHARS, '').slice(0, max)
  // Don't leave half of a surrogate pair at the cut.
  const last = out.charCodeAt(out.length - 1)
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1)
  return out
}

/** Returns null for anything that isn't a well-formed v1 payload. Never throws. */
export function parseImportHash(hash: unknown): ImportedListing | null {
  try {
    if (typeof hash !== 'string') return null
    if (!hash.startsWith(IMPORT_HASH_PREFIX)) return null
    if (hash.length > MAX_IMPORT_HASH_LENGTH) return null

    const parsed: unknown = JSON.parse(decodeURIComponent(hash.slice(IMPORT_HASH_PREFIX.length)))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

    const obj = parsed as Record<string, unknown>
    if (obj.v !== 1) return null
    if (typeof obj.url !== 'string' || typeof obj.title !== 'string' || typeof obj.text !== 'string') return null

    // Whitelist: four explicit reads into a brand-new object. No spreading of parsed data.
    return {
      url: clean(obj.url, IMPORT_LIMITS.url),
      title: clean(obj.title, IMPORT_LIMITS.title),
      text: clean(obj.text, IMPORT_LIMITS.text),
    }
  } catch {
    return null
  }
}

/** Hostname for display, or null unless the URL is a valid http(s) URL. Shown as plain text, never linked. */
export function getImportHostname(url: string): string | null {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.hostname : null
  } catch {
    return null
  }
}
