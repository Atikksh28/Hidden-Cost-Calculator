import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, getClientIp, resetRateLimits } from '../rate-limit'

const rules = [{ windowMs: 60_000, max: 2 }, { windowMs: 3_600_000, max: 3 }]

describe('checkRateLimit', () => {
  beforeEach(resetRateLimits)

  it('blocks after the per-minute max with a Retry-After', () => {
    expect(checkRateLimit('a', rules, 0).ok).toBe(true)
    expect(checkRateLimit('a', rules, 1000).ok).toBe(true)
    const r = checkRateLimit('a', rules, 2000)
    expect(r).toEqual({ ok: false, retryAfterSeconds: 58 })
  })
  it('resets after the window and tracks identities separately', () => {
    checkRateLimit('a', rules, 0); checkRateLimit('a', rules, 0)
    expect(checkRateLimit('b', rules, 0).ok).toBe(true)
    expect(checkRateLimit('a', rules, 61_000).ok).toBe(true)
  })
  it('enforces the longer window too', () => {
    checkRateLimit('a', rules, 0); checkRateLimit('a', rules, 0)
    checkRateLimit('a', rules, 61_000)
    expect(checkRateLimit('a', rules, 122_000).ok).toBe(false)
  })
})

describe('getClientIp', () => {
  it('prefers platform headers over x-forwarded-for', () => {
    const h = new Headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9, 2.2.2.2' })
    expect(getClientIp(h)).toBe('1.1.1.1')
    expect(getClientIp(new Headers({ 'x-forwarded-for': '9.9.9.9, 2.2.2.2' }))).toBe('9.9.9.9')
    expect(getClientIp(new Headers())).toBe('unknown')
  })
})
