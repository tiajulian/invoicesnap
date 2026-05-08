const ENGINE_KEY = 'invoicesnap_ocr_engine'
const GEMINI_KEY  = 'invoicesnap_gemini_key'

export function getOCREngine()       { return localStorage.getItem(ENGINE_KEY) || 'tesseract' }
export function setOCREngine(e)      { localStorage.setItem(ENGINE_KEY, e) }

export function getGeminiKey()       { return localStorage.getItem(GEMINI_KEY) || '' }
export function setGeminiKey(k)      { k ? localStorage.setItem(GEMINI_KEY, k.trim()) : localStorage.removeItem(GEMINI_KEY) }
