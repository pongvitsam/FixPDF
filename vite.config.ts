import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const repoName = 'FixPDF'
const base = process.env.GITHUB_ACTIONS ? `/${repoName}/` : '/'
const qpdfWasmSource = resolve(
  __dirname,
  'node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm',
)

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-qpdf-wasm',
      buildStart() {
        const publicDir = resolve(__dirname, 'public')
        mkdirSync(publicDir, { recursive: true })
        if (existsSync(qpdfWasmSource)) {
          copyFileSync(qpdfWasmSource, resolve(publicDir, 'qpdf.wasm'))
        }
      },
      closeBundle() {
        const outDir = resolve(__dirname, 'dist')
        const index = resolve(outDir, 'index.html')
        const fallback = resolve(outDir, '404.html')
        if (existsSync(index)) {
          copyFileSync(index, fallback)
        }
        const nojekyll = resolve(__dirname, 'public/.nojekyll')
        if (existsSync(nojekyll)) {
          copyFileSync(nojekyll, resolve(outDir, '.nojekyll'))
        }
        if (existsSync(qpdfWasmSource)) {
          copyFileSync(qpdfWasmSource, resolve(outDir, 'qpdf.wasm'))
        }
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 1600,
  },
  optimizeDeps: {
    exclude: ['tesseract.js', '@neslinesli93/qpdf-wasm'],
  },
  worker: {
    format: 'es',
  },
})
