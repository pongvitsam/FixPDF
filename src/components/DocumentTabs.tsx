import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePdf } from '../context/PdfContext'

export function DocumentTabs() {
  const { t } = useTranslation()
  const { documents, activeDocumentId, switchDocument, closeDocument } = usePdf()

  if (documents.length === 0) return null

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 print:hidden">
      {documents.map((doc) => {
        const active = doc.id === activeDocumentId
        return (
          <div
            key={doc.id}
            className={`flex max-w-[200px] shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs ${
              active
                ? 'bg-[var(--accent)] text-[var(--primary)]'
                : 'text-[var(--muted)] hover:bg-[var(--accent)]'
            }`}
          >
            <button
              type="button"
              className="min-w-0 truncate"
              title={doc.fileName}
              onClick={() => switchDocument(doc.id)}
            >
              {doc.fileName}
            </button>
            <button
              type="button"
              className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              title={t('tabs.close')}
              onClick={() => closeDocument(doc.id)}
            >
              <X className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
