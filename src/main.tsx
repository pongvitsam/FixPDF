import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { PdfProvider } from './context/PdfContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PdfProvider>
      <App />
    </PdfProvider>
  </StrictMode>,
)
