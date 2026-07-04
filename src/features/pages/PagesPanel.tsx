import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  FilePlus2,
  RotateCcw,
  RotateCw,
  Shuffle,
  Trash2,
} from 'lucide-react'
import { Button, Panel } from '../../components/ui'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import {
  deletePage,
  duplicatePage,
  insertBlankPage,
  reversePages,
  rotatePage,
} from '../../lib/pdf/operations'

export function PagesPanel() {
  const { t } = useTranslation()
  const { bytes, currentPage, pageCount, replaceBytes } = usePdf()
  const dispatch = usePdfDispatch()
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const mutate = async (runner: (input: Uint8Array) => Promise<Uint8Array>) => {
    if (!bytes) return
    dispatch({ type: 'SET_BUSY', busy: true, message: t('app.processing') })
    try {
      const output = await runner(bytes)
      await replaceBytes(output)
      dispatch({ type: 'SET_PAGE', page: Math.min(currentPage, pageCount - 1) })
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  if (!bytes) {
    return (
      <Panel title={t('pages.title')}>
        <p className="text-sm text-[var(--muted)]">{t('app.noDocument')}</p>
      </Panel>
    )
  }

  return (
    <div className="space-y-3">
      <Panel title={t('pages.title')}>
        <p className="mb-3 text-xs text-[var(--muted)]">{t('pages.reorderHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => void mutate((input) => rotatePage(input, currentPage, 270))}>
            <RotateCcw className="size-4" /> {t('pages.rotateLeft')}
          </Button>
          <Button onClick={() => void mutate((input) => rotatePage(input, currentPage, 90))}>
            <RotateCw className="size-4" /> {t('pages.rotateRight')}
          </Button>
          <Button onClick={() => void mutate((input) => duplicatePage(input, currentPage))}>
            <Copy className="size-4" /> {t('pages.duplicate')}
          </Button>
          <Button onClick={() => void mutate((input) => insertBlankPage(input, currentPage))}>
            <FilePlus2 className="size-4" /> {t('pages.addBlank')}
          </Button>
          <Button onClick={() => void mutate((input) => reversePages(input))}>
            <Shuffle className="size-4" /> {t('pages.reverse')}
          </Button>
          <Button
            disabled={pageCount <= 1}
            onClick={() => void mutate((input) => deletePage(input, currentPage))}
          >
            <Trash2 className="size-4" /> {t('pages.delete')}
          </Button>
        </div>
      </Panel>

      <Panel title={`${t('viewer.page')} 1-${pageCount}`}>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index || !bytes) return
                void (async () => {
                  const order = Array.from({ length: pageCount }, (_, i) => i)
                  const [moved] = order.splice(dragIndex, 1)
                  order.splice(index, 0, moved)
                  const { reorderPages } = await import('../../lib/pdf/operations')
                  dispatch({ type: 'SET_BUSY', busy: true })
                  try {
                    const output = await reorderPages(bytes, order)
                    await replaceBytes(output)
                    dispatch({ type: 'SET_PAGE', page: index })
                  } finally {
                    dispatch({ type: 'SET_BUSY', busy: false })
                    setDragIndex(null)
                  }
                })()
              }}
              onClick={() => dispatch({ type: 'SET_PAGE', page: index })}
              className={`rounded-lg border px-2 py-3 text-sm ${currentPage === index ? 'border-[var(--primary)] bg-[var(--accent)]' : 'border-[var(--border)]'}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}
