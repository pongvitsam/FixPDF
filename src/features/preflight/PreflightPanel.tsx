import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck } from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { runPreflight, type PreflightCheck } from '../../lib/pdf/preflight'

const statusColor: Record<PreflightCheck['status'], string> = {
  pass: 'text-emerald-600',
  warn: 'text-amber-600',
  fail: 'text-red-600',
}

export function PreflightPanel() {
  const { t } = useTranslation()
  const { bytes, pdfPassword } = usePdf()
  const dispatch = usePdfDispatch()
  const [checks, setChecks] = useState<PreflightCheck[]>([])

  const run = async () => {
    if (!bytes) return
    dispatch({ type: 'SET_BUSY', busy: true, message: t('preflight.running') })
    try {
      setChecks(await runPreflight(bytes, pdfPassword ?? undefined))
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  return (
    <Panel title={t('preflight.title')}>
      <p className="mb-3 text-xs text-[var(--muted)]">{t('preflight.hint')}</p>
      <Button variant="primary" disabled={!bytes} onClick={() => void run()}>
        <ClipboardCheck className="size-4" /> {t('preflight.run')}
      </Button>
      {checks.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {checks.map((check) => (
            <li
              key={check.id}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span className={`font-medium uppercase ${statusColor[check.status]}`}>
                {t(`preflight.status.${check.status}`)}
              </span>
              <div className="mt-1 text-[var(--muted)]">{check.message}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}
