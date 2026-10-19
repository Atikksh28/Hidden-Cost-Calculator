import { describe, expect, it } from 'vitest'
import { getImportHostname, parseImportHash, MAX_IMPORT_HASH_LENGTH } from '../import-listing'

const hashOf = (payload: unknown) => '#lx=' + encodeURIComponent(JSON.stringify(payload))
const good = { v: 1, url: 'https://example.com/flat/1', title: 'Nice flat', text: '2BHK, rent 32000' }

describe('parseImportHash', () => {
  it('accepts a valid payload', () => {
    expect(parseImportHash(hashOf(good))).toEqual({ url: good.url, title: good.title, text: good.text })
  })

  it('returns only the three content fields (v is consumed, extras dropped)', () => {
    const r = parseImportHash(hashOf({ ...good, extra: 'x', admin: true }))
    expect(Object.keys(r!).sort()).toEqual(['text', 'title', 'url'])
  })

  it('rejects hashes without the #lx= prefix', () => {
    expect(parseImportHash('')).toBeNull()
    expect(parseImportHash('#other=' + encodeURIComponent(JSON.stringify(good)))).toBeNull()
    expect(parseImportHash(encodeURIComponent(JSON.stringify(good)))).toBeNull()
  })

  it('rejects malformed JSON and bad percent-encoding without throwing', () => {
    expect(parseImportHash('#lx=' + encodeURIComponent('{not json'))).toBeNull()
    expect(parseImportHash('#lx=%E0%A4%A')).toBeNull()
    expect(parseImportHash('#lx=')).toBeNull()
  })

  it('rejects the wrong version', () => {
    expect(parseImportHash(hashOf({ ...good, v: 2 }))).toBeNull()
    expect(parseImportHash(hashOf({ ...good, v: '1' }))).toBeNull()
    expect(parseImportHash(hashOf({ url: good.url, title: good.title, text: good.text }))).toBeNull()
  })

  it('rejects missing fields', () => {
    expect(parseImportHash(hashOf({ v: 1, url: 'u', title: 't' }))).toBeNull()
    expect(parseImportHash(hashOf({ v: 1, url: 'u', text: 'x' }))).toBeNull()
    expect(parseImportHash(hashOf({ v: 1, title: 't', text: 'x' }))).toBeNull()
  })

  it('rejects wrong types and non-object JSON', () => {
    expect(parseImportHash(hashOf({ ...good, text: 123 }))).toBeNull()
    expect(parseImportHash(hashOf({ ...good, url: null }))).toBeNull()
    expect(parseImportHash(hashOf({ ...good, title: ['a'] }))).toBeNull()
    expect(parseImportHash(hashOf([good]))).toBeNull()
    expect(parseImportHash(hashOf('str'))).toBeNull()
    expect(parseImportHash(hashOf(null))).toBeNull()
    expect(parseImportHash(undefined)).toBeNull()
    expect(parseImportHash(42)).toBeNull()
  })

  it('truncates oversized fields instead of failing', () => {
    const r = parseImportHash(hashOf({ v: 1, url: 'h'.repeat(900), title: 't'.repeat(900), text: 'x'.repeat(50_000) }))
    expect(r!.url).toHaveLength(500)
    expect(r!.title).toHaveLength(300)
    expect(r!.text).toHaveLength(8000)
  })

  it('does not split a surrogate pair at the cut', () => {
    const r = parseImportHash(hashOf({ ...good, text: 'a'.repeat(7999) + '😀' }))
    expect(r!.text).toBe('a'.repeat(7999))
  })

  it('refuses to decode a huge hash', () => {
    expect(parseImportHash('#lx=' + 'a'.repeat(MAX_IMPORT_HASH_LENGTH + 1))).toBeNull()
  })

  it('strips control characters but keeps newlines and tabs', () => {
    const r = parseImportHash(hashOf({ ...good, text: 'a\u0000b\u0007c\u001bd\u007fe\nf\tg\r\nh' }))
    expect(r!.text).toBe('abcde\nf\tg\r\nh')
  })

  it('passes <script> through as inert text (no sanitising, no execution at this layer)', () => {
    const r = parseImportHash(hashOf({ ...good, text: '<script>alert(1)</script> rent 100' }))
    expect(r!.text).toBe('<script>alert(1)</script> rent 100')
  })

  it('is not affected by __proto__ / constructor keys', () => {
    const raw = '{"v":1,"url":"u","title":"t","text":"x","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
    const r = parseImportHash('#lx=' + encodeURIComponent(raw))
    expect(r).toEqual({ url: 'u', title: 't', text: 'x' })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype)
    expect('polluted' in r!).toBe(false)
  })
})

describe('getImportHostname', () => {
  it('returns the hostname for http(s) URLs', () => {
    expect(getImportHostname('https://www.example.com/a?b=1')).toBe('www.example.com')
    expect(getImportHostname('http://example.org')).toBe('example.org')
  })
  it('ignores everything else', () => {
    expect(getImportHostname('javascript:alert(1)')).toBeNull()
    expect(getImportHostname('data:text/html,hi')).toBeNull()
    expect(getImportHostname('file:///etc/passwd')).toBeNull()
    expect(getImportHostname('not a url')).toBeNull()
    expect(getImportHostname('')).toBeNull()
  })
})
