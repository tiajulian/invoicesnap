/**
 * InvoiceSnap OCR Proxy — Cloudflare Worker
 *
 * Two rate limits:
 * 1. Global lifetime cap: 1,000 total scans across all users ever
 * 2. Per-IP daily cap: 50 scans per user per day
 */

const ALLOWED_ORIGINS = [
  'https://tiajulian.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const MAX_GLOBAL_TOTAL   = 1000  // lifetime cap across all users
const MAX_PER_IP_PER_DAY = 50    // per user per day

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    const cors = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    // ── 1. Global lifetime cap ─────────────────────────────────────────────
    const globalCount = parseInt(await env.RATE_LIMIT.get('global:total') || '0')

    if (globalCount >= MAX_GLOBAL_TOTAL) {
      return new Response(
        JSON.stringify({ error: { message: 'Global scan limit reached.' } }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ── 2. Per-IP daily cap ────────────────────────────────────────────────
    const ip    = request.headers.get('CF-Connecting-IP') || 'unknown'
    const today = new Date().toISOString().slice(0, 10)
    const ipKey = `ip:${ip}:${today}`

    const ipCount = parseInt(await env.RATE_LIMIT.get(ipKey) || '0')

    if (ipCount >= MAX_PER_IP_PER_DAY) {
      return new Response(
        JSON.stringify({ error: { message: 'Daily scan limit reached. Try again tomorrow.' } }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // ── Increment both counters ────────────────────────────────────────────
    await Promise.all([
      env.RATE_LIMIT.put('global:total', String(globalCount + 1)),          // no expiry — lifetime
      env.RATE_LIMIT.put(ipKey, String(ipCount + 1), { expirationTtl: 90000 }), // expires after 25h
    ])

    // ── Proxy to Gemini ────────────────────────────────────────────────────
    try {
      const body = await request.json()

      const upstream = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await upstream.json()

      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      return new Response(
        JSON.stringify({ error: { message: err.message } }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }
  },
}
