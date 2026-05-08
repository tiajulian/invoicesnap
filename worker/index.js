/**
 * InvoiceSnap OCR Proxy — Cloudflare Worker
 *
 * Forwards invoice scan requests to Gemini API.
 * The GEMINI_API_KEY secret is stored in Cloudflare — never in the app bundle.
 *
 * Deploy:
 *   cd worker
 *   npx wrangler deploy
 *   npx wrangler secret put GEMINI_API_KEY   ← paste your key when prompted
 */

const ALLOWED_ORIGINS = [
  'https://tiajulian.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    const cors = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

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
