import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const repoName = 'FixPDF'
const base = process.env.GITHUB_ACTIONS ? `/${repoName}/` : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spa-404',
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
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 1200,
  },
  optimizeDeps: {
    exclude: ['tesseract.js'],
  },
})
