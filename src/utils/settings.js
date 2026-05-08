const KEY = 'invoicesnap_settings'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function persist(data) { localStorage.setItem(KEY, JSON.stringify(data)) }

export function getSetting(key, fallback = null) { return load()[key] ?? fallback }
export function setSetting(key, value) { const s = load(); s[key] = value; persist(s) }

function detectCurrency() {
  const locale = navigator.language || ''
  const map = [
    ['en-AU', 'AUD'], ['en-NZ', 'NZD'], ['en-GB', 'GBP'], ['en-CA', 'CAD'],
    ['en-US', 'USD'], ['ja', 'JPY'], ['de', 'EUR'], ['fr', 'EUR'],
    ['es', 'EUR'], ['pt', 'EUR'], ['zh', 'CNY'], ['ko', 'KRW'], ['hi', 'INR'],
  ]
  for (const [prefix, code] of map) {
    if (locale.startsWith(prefix)) return code
  }
  return 'AUD'
}

export function getDefaultCurrency() {
  return getSetting('defaultCurrency') || detectCurrency()
}
