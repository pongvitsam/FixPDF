import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function Toast() {
  const { t } = useTranslation()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      setMessage(detail)
      window.setTimeout(() => setMessage(null), 2800)
    }
    window.addEventListener('fixpdf-toast', handler)
    return () => window.removeEventListener('fixpdf-toast', handler)
  }, [])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm shadow-lg ring-1 ring-[var(--border)]">
      {message.startsWith('toast.') ? t(message) : message}
    </div>
  )
}

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent('fixpdf-toast', { detail: message }))
}
