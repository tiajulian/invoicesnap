import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/invoicesnap/',
  optimizeDeps: {
    // Exclude Transformers.js from pre-bundling so the large ONNX Runtime
    // WASM file (23 MB) is not included in the initial JS bundle.
    // It will only be fetched when the Donut engine is first activated.
    exclude: ['@huggingface/transformers'],
  },
})
