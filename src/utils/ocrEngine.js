const GEMINI_KEY = 'invoicesnap_gemini_key'

export function getGeminiKey() { return localStorage.getItem(GEMINI_KEY) || '' }
export function setGeminiKey(k) { k ? localStorage.setItem(GEMINI_KEY, k.trim()) : localStorage.removeItem(GEMINI_KEY) }
