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
const pdfiumWasmSource = resolve(
  __dirname,
  'node_modules/clawpdf/dist/vendor/pdfium.esm.wasm',
)

function copyWasmAssets(publicDir: string, outDir?: string) {
  mkdirSync(publicDir, { recursive: true })
  if (existsSync(qpdfWasmSource)) {
    copyFileSync(qpdfWasmSource, resolve(publicDir, 'qpdf.wasm'))
    if (outDir) copyFileSync(qpdfWasmSource, resolve(outDir, 'qpdf.wasm'))
  }
  if (existsSync(pdfiumWasmSource)) {
    copyFileSync(pdfiumWasmSource, resolve(publicDir, 'pdfium.esm.wasm'))
    if (outDir) copyFileSync(pdfiumWasmSource, resolve(outDir, 'pdfium.esm.wasm'))
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-wasm-assets',
      buildStart() {
        copyWasmAssets(resolve(__dirname, 'public'))
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
        copyWasmAssets(resolve(__dirname, 'public'), outDir)
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  optimizeDeps: {
    exclude: ['tesseract.js', '@neslinesli93/qpdf-wasm', 'clawpdf'],
  },
  worker: {
    format: 'es',
  },
})
