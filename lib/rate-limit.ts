/**
 * Small fixed-window rate limiter, in memory.
 *
 * LIMITATION: counters live in one server instance. On Vercel (serverless) each instance has its
 * own memory, so this only slows down casual abuse. For real protection put a shared limit in
 * front (Vercel Firewall rate-limit rule, or Upstash Redis with @upstash/ratelimit) — keep this as
 * the cheap first line either way.
 */

export interface RateRule {
  /** Window length in milliseconds. */
  windowMs: number
  max: number
}

export type RateResult = { ok: true } | { ok: false; retryAfterSeconds: number }

const MAX_TRACKED_KEYS = 10_000

const hits = new Map<string, { count: number; resetAt: number }>()

function purgeExpired(now: number) {
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key)
  }
}

/** Counts one request against every rule; rejects (without counting) if any window is already full. */
export function checkRateLimit(identity: string, rules: RateRule[], now: number = Date.now()): RateResult {
  if (hits.size > MAX_TRACKED_KEYS) purgeExpired(now)

  let retryAfter = 0
  const active = rules.map((rule) => {
    const key = `${identity}:${rule.windowMs}`
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + rule.windowMs }
      hits.set(key, entry)
    }
    if (entry.count >= rule.max) retryAfter = Math.max(retryAfter, Math.ceil((entry.resetAt - now) / 1000))
    return entry
  })

  if (retryAfter > 0) return { ok: false, retryAfterSeconds: retryAfter }
  for (const entry of active) entry.count += 1
  return { ok: true }
}

/** For tests. */
export function resetRateLimits() {
  hits.clear()
}

/**
 * The caller's IP from headers the hosting platform sets. On Vercel, x-vercel-forwarded-for / x-real-ip
 * are written by the platform and can't be spoofed by the client; the x-forwarded-for fallback
 * is only trustworthy behind a proxy that overwrites it.
 */
export function getClientIp(headers: Headers): string {
  const direct = headers.get('x-vercel-forwarded-for') ?? headers.get('x-real-ip')
  if (direct) return direct.split(',')[0].trim() || 'unknown'
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim() || 'unknown'
  return 'unknown'
}
