import { useTranslation } from 'react-i18next'
import { Eraser, Highlighter, MessageSquare, Square, Strikethrough, Type, Underline } from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import type { AnnotationKind } from '../../types'

const kinds: { kind: AnnotationKind; icon: typeof Highlighter; label: string }[] = [
  { kind: 'highlight', icon: Highlighter, label: 'annotate.highlight' },
  { kind: 'underline', icon: Underline, label: 'annotate.underline' },
  { kind: 'strikeout', icon: Strikethrough, label: 'annotate.strikeout' },
  { kind: 'note', icon: MessageSquare, label: 'annotate.note' },
  { kind: 'text', icon: Type, label: 'annotate.text' },
  { kind: 'rectangle', icon: Square, label: 'annotate.rectangle' },
  { kind: 'redaction', icon: Eraser, label: 'toolkit.redact' },
]

export function AnnotatePanel() {
  const { t } = useTranslation()
  const { annotateKind, annotations, commitAnnotations } = usePdf()
  const dispatch = usePdfDispatch()

  return (
    <div className="space-y-3">
      <Panel title={t('annotate.title')}>
        <div className="grid grid-cols-2 gap-2">
          {kinds.map(({ kind, icon: Icon, label }) => (
            <Button
              key={kind}
              variant={annotateKind === kind ? 'primary' : 'outline'}
              onClick={() => {
                dispatch({ type: 'SET_ANNOTATE_KIND', kind })
                dispatch({ type: 'SET_PANEL', panel: 'annotate' })
              }}
            >
              <Icon className="size-4" /> {t(label)}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Drag on the page canvas to create an annotation.
        </p>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-[var(--muted)]">{annotations.length} items</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => dispatch({ type: 'CLEAR_ANNOTATIONS' })}>
              {t('annotate.clearAll')}
            </Button>
            <Button variant="primary" disabled={annotations.length === 0} onClick={() => void commitAnnotations()}>
              {t('toolkit.apply')}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
