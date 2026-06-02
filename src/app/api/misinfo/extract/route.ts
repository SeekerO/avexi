// ============================================================
// MisinfoTracker — OG Metadata Extractor API Route
// src/app/api/misinfo/extract/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
// import { requireAuth } from '@/lib/auth'
import type { OGMetadata } from '@/app/misinfo/types/types'

// ----------------------------------------------------------
// Config
// ----------------------------------------------------------

// Facebook's own crawler UA — makes FB serve proper OG tags
// instead of a login wall or JS-gated content
const FB_CRAWLER_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

const FETCH_TIMEOUT_MS = 8000

// Domains we allow scraping (whitelist — only public FB URLs)
const ALLOWED_DOMAINS = [
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'fb.com',
  'www.fb.com',
]

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------

function isAllowedUrl(raw: string): { ok: boolean; reason?: string } {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'Invalid URL format.' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Only http/https URLs are allowed.' }
  }

  const host = parsed.hostname.toLowerCase()
  if (!ALLOWED_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) {
    return { ok: false, reason: 'Only Facebook URLs are supported.' }
  }

  return { ok: true }
}

function extractMeta(html: string, property: string): string {
  // Matches both property="og:x" and name="og:x" variants
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1].trim())
  }

  return ''
}

function extractTitle(html: string): string {
  // OG title takes priority, then <title> tag
  const ogTitle = extractMeta(html, 'og:title')
  if (ogTitle) return ogTitle

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : ''
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

// ----------------------------------------------------------
// Route Handler
// ----------------------------------------------------------

export async function GET(req: NextRequest) {
  // 1. Auth guard
//   const authError = await requireAuth(req)
//   if (authError) return authError

  // 2. Parse & validate ?url= param
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get('url') ?? ''

  if (!rawUrl) {
    return NextResponse.json(
      { error: 'Missing required query param: url' },
      { status: 400 }
    )
  }

  const { ok, reason } = isAllowedUrl(rawUrl)
  if (!ok) {
    return NextResponse.json({ error: reason }, { status: 400 })
  }

  // 3. Fetch with facebookexternalhit UA + timeout
  let html: string
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent': FB_CRAWLER_UA,
        'Accept':     'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!res.ok) {
      return NextResponse.json(
        { error: `Facebook returned HTTP ${res.status}. The post may be private or removed.` },
        { status: 422 }
      )
    }

    // Only read text — never parse binary
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'URL did not return an HTML page.' },
        { status: 422 }
      )
    }

    // Read only the first 100KB — OG tags are always in <head>
    const reader  = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let   bytesRead = 0
    const MAX_BYTES = 100_000

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done || !value) break
        chunks.push(value)
        bytesRead += value.byteLength
        if (bytesRead >= MAX_BYTES) break
      }
      reader.cancel()
    }

    html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length)
        merged.set(acc)
        merged.set(chunk, acc.length)
        return merged
      }, new Uint8Array(0))
    )
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out. The post URL may be inaccessible.' },
        { status: 504 }
      )
    }
    console.error('[misinfo/extract] Fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch the post URL.' },
      { status: 502 }
    )
  }

  // 4. Extract OG fields
  const metadata: OGMetadata = {
    title:       extractTitle(html),
    description: extractMeta(html, 'og:description'),
    image:       extractMeta(html, 'og:image') || undefined,
    url:         extractMeta(html, 'og:url')   || rawUrl,
    siteName:    extractMeta(html, 'og:site_name') || undefined,
  }

  // 5. Warn if we got very little — FB may be rate-limiting or gating
  const hasUsefulData = metadata.title || metadata.description
  if (!hasUsefulData) {
    return NextResponse.json({
      metadata,
      warning:
        'Could not extract meaningful content. Facebook may be blocking the request, ' +
        'or the post requires a login. You can fill in the fields manually.',
    })
  }

  return NextResponse.json({ metadata })
}