import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip } from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import { downloadBlob } from '../../lib/files'
import { usePdf } from '../../context/PdfContext'
import { downloadAttachment, loadAttachments, type AttachmentInfo } from '../../lib/pdf/catalog'

export function AttachmentsPanel() {
  const { t } = useTranslation()
  const { bytes, pdfPassword } = usePdf()
  const [items, setItems] = useState<AttachmentInfo[]>([])

  useEffect(() => {
    if (!bytes) {
      setItems([])
      return
    }
    void (async () => {
      setItems(await loadAttachments(bytes, pdfPassword ?? undefined))
    })()
  }, [bytes, pdfPassword])

  return (
    <Panel title={t('attachments.title')}>
      {!bytes ? (
        <p className="text-sm text-[var(--muted)]">{t('app.noDocument')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('attachments.empty')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {(item.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  void (async () => {
                    if (!bytes) return
                    const blob = await downloadAttachment(bytes, item.name, pdfPassword ?? undefined)
                    downloadBlob(blob, item.name)
                  })()
                }
              >
                <Paperclip className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
