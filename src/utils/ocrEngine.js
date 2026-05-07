const KEY = 'invoicesnap_ocr_engine'

export function getOCREngine() {
  return localStorage.getItem(KEY) || 'tesseract'
}

export function setOCREngine(engine) {
  localStorage.setItem(KEY, engine)
}
