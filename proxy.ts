import { NextRequest, NextResponse } from 'next/server'

/**
 * Per-request Content-Security-Policy with a nonce. Runs on page requests only (not static assets or
 * the API route). Currently REPORT-ONLY: violations show in the browser console but nothing is blocked.
 * Once a full click-through shows no violations, switch REPORT_ONLY to false to enforce.
 */
const REPORT_ONLY = true

function supabaseOrigins(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    return `${url.origin} wss://${url.host}`
  } catch {
    return ''
  }
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'

  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonce'd Next.js scripts load their own chunks. React needs eval only in dev.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline styles: React/d3 set style attributes at runtime, which nonces can't cover.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self' ${supabaseOrigins()}${isDev ? ' ws://localhost:* http://localhost:*' : ''}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ')

  const headerName = REPORT_ONLY ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set(headerName, csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(headerName, csp)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
