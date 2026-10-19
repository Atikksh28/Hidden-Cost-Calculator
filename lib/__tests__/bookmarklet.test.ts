import { describe, expect, it } from 'vitest'
import { buildBookmarkletCode, buildBookmarkletHref } from '../bookmarklet'
import { parseImportHash } from '../import-listing'

/** Runs the real generated code against a fake page and captures what it would open. */
function run(opts: { selection?: string; body?: string; mainText?: string | null; title?: string; origin?: string; ld?: string }) {
  const opened: unknown[][] = []
  const meta: Record<string, string> = { 'og:title': 'OG Title', 'og:description': 'OG desc' }
  const doc = {
    title: opts.title ?? 'Flat in Pune',
    body: { innerText: opts.body ?? 'BODY TEXT' },
    querySelector: (sel: string) => {
      if (sel === 'main') return opts.mainText == null ? null : { innerText: opts.mainText }
      if (sel === 'article') return null
      const m = sel.match(/"([^"]+)"/)
      return m && meta[m[1]] ? { content: meta[m[1]] } : null
    },
    querySelectorAll: () => (opts.ld ? [{ textContent: opts.ld }] : []),
  }
  const win = { getSelection: () => opts.selection ?? '', open: (...a: unknown[]) => opened.push(a) }
  new Function('window', 'document', 'location', buildBookmarkletCode(opts.origin ?? 'http://localhost:3000'))(
    win, doc, { href: 'https://site.example/listing/1?x=' + 'y'.repeat(600) }
  )
  return opened
}

describe('bookmarklet', () => {
  it('opens the app origin with a payload the parser accepts, using noopener,noreferrer', () => {
    const [[url, target, features]] = run({ mainText: 'MAIN TEXT', ld: '{"@type":"Apartment"}' }) as [[string, string, string]]
    expect(url.startsWith('http://localhost:3000/#lx=')).toBe(true)
    expect(target).toBe('_blank')
    expect(features).toBe('noopener,noreferrer')
    const parsed = parseImportHash(url.slice('http://localhost:3000/'.length))!
    expect(parsed.title).toBe('Flat in Pune')
    expect(parsed.url).toHaveLength(500)
    expect(parsed.text).toContain('OG Title')
    expect(parsed.text).toContain('{"@type":"Apartment"}')
    expect(parsed.text).toContain('MAIN TEXT')
  })

  it('prefers the user selection over the page body', () => {
    const [[url]] = run({ selection: 'SELECTED', mainText: 'MAIN' }) as [[string]]
    const text = parseImportHash(url.slice(url.indexOf('#')))!.text
    expect(text).toContain('SELECTED')
    expect(text).not.toContain('MAIN')
  })

  it('caps text at 8000 characters', () => {
    const [[url]] = run({ mainText: 'x'.repeat(50000) }) as [[string]]
    expect(parseImportHash(url.slice(url.indexOf('#')))!.text.length).toBeLessThanOrEqual(8000)
  })

  it('takes the origin from its argument (not hardcoded)', () => {
    const [[url]] = run({ origin: 'https://calc.example.com' }) as [[string]]
    expect(url.startsWith('https://calc.example.com/#lx=')).toBe(true)
  })

  it('contains nothing that talks to the network or storage', () => {
    const code = buildBookmarkletCode('http://localhost:3000')
    for (const banned of ['fetch', 'XMLHttpRequest', 'document.cookie', 'localStorage', 'sessionStorage', 'createElement', 'src=', 'import(', 'eval', '<input', 'value']) {
      expect(code).not.toContain(banned)
    }
  })

  it('is a javascript: URL', () => {
    const href = buildBookmarkletHref('http://localhost:3000')
    expect(href.startsWith('javascript:')).toBe(true)
    console.log('BOOKMARKLET LINK LENGTH:', href.length, '| raw code length:', buildBookmarkletCode('http://localhost:3000').length)
  })
})
