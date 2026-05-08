/**
 * InvoiceSnap OCR Proxy — Cloudflare Worker
 *
 * Forwards invoice scan requests to Gemini API.
 * Rate limited to 100 requests/day total across all users.
 */

const ALLOWED_ORIGINS = [
  'https://tiajulian.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Hard cap per IP address per day
const MAX_PER_IP_PER_DAY = 50

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    const cors = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    // ── Rate limiting per IP via KV ────────────────────────────────────────
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
    const today = new Date().toISOString().slice(0, 10) // "2026-05-08"
    const kvKey = `ip:${ip}:${today}`

    const current = parseInt(await env.RATE_LIMIT.get(kvKey) || '0')

    if (current >= MAX_PER_IP_PER_DAY) {
      return new Response(
        JSON.stringify({ error: { message: 'Daily scan limit reached. Try again tomorrow.' } }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    // Increment this IP's counter (expires after 25 hours)
    await env.RATE_LIMIT.put(kvKey, String(current + 1), { expirationTtl: 90000 })

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
