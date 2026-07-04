import { useTranslation } from 'react-i18next'
import { Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'

export function InspectorPanel() {
  const { t } = useTranslation()
  const { annotations, selectedAnnotationId } = usePdf()
  const dispatch = usePdfDispatch()
  const selected = annotations.find((item) => item.id === selectedAnnotationId)

  return (
    <Panel title={t('inspector.title')}>
      {!selected ? (
        <p className="text-sm text-[var(--muted)]">{t('inspector.empty')}</p>
      ) : (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-[var(--muted)]">{t('inspector.kind')}</dt>
            <dd className="font-medium">{selected.kind}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">{t('viewer.page')}</dt>
            <dd>{selected.pageIndex + 1}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">{t('inspector.position')}</dt>
            <dd>
              x {Math.round(selected.x)}, y {Math.round(selected.y)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">{t('inspector.size')}</dt>
            <dd>
              {Math.round(selected.width)} × {Math.round(selected.height)}
            </dd>
          </div>
          {selected.text ? (
            <div>
              <dt className="text-[var(--muted)]">{t('annotate.text')}</dt>
              <dd>{selected.text}</dd>
            </div>
          ) : null}
          <button
            type="button"
            className="mt-2 text-xs text-[var(--primary)]"
            onClick={() => dispatch({ type: 'SET_PAGE', page: selected.pageIndex })}
          >
            {t('inspector.goToPage')}
          </button>
        </dl>
      )}
    </Panel>
  )
}
