import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import th from './th.json'

const STORAGE_KEY = 'fixpdf-language'

function detectLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'th') return saved
  } catch {
    /* ignore */
  }
  return navigator.language.toLowerCase().startsWith('th') ? 'th' : 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    th: { translation: th },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: 'en' | 'th') {
  void i18n.changeLanguage(lang)
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}

export default i18n
