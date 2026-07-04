import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Crop,
  FileImage,
  FileText,
  GitMerge,
  Layers3,
  Lock,
  LockOpen,
  RotateCw,
  ScanText,
  Shield,
  Split,
  Stamp,
} from 'lucide-react'
import { Button, Field, Input, Panel } from '../../components/ui'
import { downloadBlob, formatBytes, openPdfFile } from '../../lib/files'
import { canvasToBmpBlob, canvasToTiffBlob } from '../../lib/pdf/imageExport'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import {
  addWatermark,
  cropMargins,
  decryptPdf,
  encryptPdf,
  extractPageRange,
  mergePdfFiles,
  readPdfMetadata,
  rotateAllPages,
  splitPdfAllPages,
  unlockPasswordProtectedPdf,
} from '../../lib/pdf/operations'
import { loadPdfDocument, renderPageToCanvas, renderPageToImage } from '../../lib/pdf/viewer'

export function ToolkitPanel() {
  const { t } = useTranslation()
  const { bytes, currentPage, fileName, metadata, pdfPassword, replaceBytes } = usePdf()
  const dispatch = usePdfDispatch()
  const [watermark, setWatermark] = useState('FixPDF')
  const [rangeStart, setRangeStart] = useState('1')
  const [rangeEnd, setRangeEnd] = useState('1')
  const [metadataText, setMetadataText] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [encryptPassword, setEncryptPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')

  const run = async (task: () => Promise<void>) => {
    dispatch({ type: 'SET_BUSY', busy: true, message: t('app.processing') })
    try {
      await task()
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  return (
    <div className="space-y-3">
      <Panel title={t('toolkit.title')}>
        <p className="mb-3 text-xs text-[var(--muted)]">{t('toolkit.mergeHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              void run(async () => {
                const files = await openPdfFile(true)
                if (files.length < 2) return
                const parts = await Promise.all(
                  files.map(async (file) => new Uint8Array(await file.arrayBuffer())),
                )
                const merged = await mergePdfFiles(parts)
                await replaceBytes(merged, 'merged.pdf')
              })
            }
          >
            <GitMerge className="size-4" /> {t('toolkit.merge')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const parts = await splitPdfAllPages(bytes)
                parts.forEach((part, index) =>
                  downloadBlob(
                    new Blob([part.slice()], { type: 'application/pdf' }),
                    `${fileName.replace(/\.pdf$/i, '')}-page-${index + 1}.pdf`,
                  ),
                )
              })
            }
          >
            <Split className="size-4" /> {t('toolkit.splitAll')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const start = Number(rangeStart)
                const end = Number(rangeEnd)
                const extracted = await extractPageRange(bytes, start, end)
                await replaceBytes(extracted, `extract-${start}-${end}.pdf`)
              })
            }
          >
            <Layers3 className="size-4" /> {t('toolkit.splitRange')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const rotated = await rotateAllPages(bytes, 90)
                await replaceBytes(rotated)
              })
            }
          >
            <RotateCw className="size-4" /> {t('toolkit.rotate')}
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('toolkit.splitRange')}>
            <div className="flex gap-2">
              <Input value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              <Input value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
          </Field>
          <Field label={t('toolkit.watermarkText')}>
            <Input value={watermark} onChange={(e) => setWatermark(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await addWatermark(bytes, watermark)
                await replaceBytes(output)
              })
            }
          >
            <Stamp className="size-4" /> {t('toolkit.watermark')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await cropMargins(bytes)
                await replaceBytes(output)
              })
            }
          >
            <Crop className="size-4" /> {t('toolkit.crop')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                const png = await renderPageToImage(pdf, currentPage, 2, 'image/png')
                downloadBlob(png, `${fileName.replace(/\.pdf$/i, '')}-p${currentPage + 1}.png`)
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.exportPng')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                const jpg = await renderPageToImage(pdf, currentPage, 2, 'image/jpeg')
                downloadBlob(jpg, `${fileName.replace(/\.pdf$/i, '')}-p${currentPage + 1}.jpg`)
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.exportJpg')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                const webp = await renderPageToImage(pdf, currentPage, 2, 'image/webp')
                downloadBlob(webp, `${fileName.replace(/\.pdf$/i, '')}-p${currentPage + 1}.webp`)
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.exportWebp')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                const canvas = document.createElement('canvas')
                await renderPageToCanvas(pdf, currentPage, 2, canvas)
                const bmp = await canvasToBmpBlob(canvas)
                downloadBlob(bmp, `${fileName.replace(/\.pdf$/i, '')}-p${currentPage + 1}.bmp`)
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.exportBmp')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                const canvas = document.createElement('canvas')
                await renderPageToCanvas(pdf, currentPage, 2, canvas)
                const tiff = await canvasToTiffBlob(canvas)
                downloadBlob(tiff, `${fileName.replace(/\.pdf$/i, '')}-p${currentPage + 1}.tiff`)
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.exportTiff')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const meta = await readPdfMetadata(bytes)
                setMetadataText(
                  [
                    `${t('metadata.pages')}: ${meta.pageCount}`,
                    `${t('metadata.size')}: ${formatBytes(bytes.byteLength)}`,
                    meta.title ? `${t('metadata.titleLabel')}: ${meta.title}` : '',
                    meta.author ? `${t('metadata.authorLabel')}: ${meta.author}` : '',
                    meta.subject ? `${t('metadata.subjectLabel')}: ${meta.subject}` : '',
                  ]
                    .filter(Boolean)
                    .join('\n'),
                )
              })
            }
          >
            <FileText className="size-4" /> {t('toolkit.metadata')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                const canvas = document.createElement('canvas')
                await renderPageToCanvas(pdf, currentPage, 2, canvas)
                const { runOcrFromCanvas } = await import('../../lib/pdf/ocr')
                const text = await runOcrFromCanvas(canvas)
                setOcrText(text)
                dispatch({ type: 'SET_OCR', text })
              })
            }
          >
            <ScanText className="size-4" /> {t('toolkit.ocr')}
          </Button>
        </div>
      </Panel>

      {metadataText ? (
        <Panel title={t('metadata.title')}>
          <pre className="whitespace-pre-wrap text-xs text-[var(--muted)]">{metadataText}</pre>
        </Panel>
      ) : null}

      {ocrText ? (
        <Panel title={t('ocr.result')}>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{ocrText}</pre>
        </Panel>
      ) : null}

      <Panel title={t('metadata.encrypted')}>
        <p className="mb-3 text-xs text-[var(--muted)]">{t('toolkit.securityHint')}</p>
        <div className="mb-3 grid grid-cols-1 gap-2">
          <Field label={t('toolkit.password')}>
            <Input
              type="password"
              value={encryptPassword}
              onChange={(event) => setEncryptPassword(event.target.value)}
            />
          </Field>
          <Field label={t('security.ownerPassword')}>
            <Input
              type="password"
              value={ownerPassword}
              onChange={(event) => setOwnerPassword(event.target.value)}
              placeholder={t('security.ownerOptional')}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!bytes || !encryptPassword}
            onClick={() =>
              void run(async () => {
                if (!bytes || !encryptPassword) return
                const output = await encryptPdf(bytes, encryptPassword, ownerPassword || undefined)
                await replaceBytes(output, undefined, encryptPassword)
              })
            }
          >
            <Lock className="size-4" /> {t('toolkit.encrypt')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                let output: Uint8Array
                if (metadata?.encrypted && pdfPassword) {
                  output = await unlockPasswordProtectedPdf(bytes, pdfPassword)
                } else if (metadata?.encrypted) {
                  output = await decryptPdf(bytes, pdfPassword ?? undefined)
                } else {
                  output = await decryptPdf(bytes)
                }
                await replaceBytes(output, undefined, null)
              })
            }
          >
            <LockOpen className="size-4" /> {t('toolkit.decrypt')}
          </Button>
        </div>
      </Panel>

      <FormFillerSection />
      <RedactionSection />
    </div>
  )
}

function FormFillerSection() {
  const { t } = useTranslation()
  const { bytes, replaceBytes } = usePdf()
  const dispatch = usePdfDispatch()
  const [fields, setFields] = useState<{ name: string; type: string }[]>([])
  const [selected, setSelected] = useState('')
  const [value, setValue] = useState('')

  return (
    <Panel title={t('form.title')}>
      <div className="space-y-2">
        <Button
          disabled={!bytes}
          variant="outline"
          onClick={() =>
            void (async () => {
              if (!bytes) return
              const { listFormFields } = await import('../../lib/pdf/operations')
              const result = await listFormFields(bytes)
              setFields(result)
              setSelected(result[0]?.name ?? '')
            })()
          }
        >
          <Shield className="size-4" /> {t('toolkit.formFiller')}
        </Button>
        {fields.length > 0 ? (
          <>
            <Field label={t('form.fieldName')}>
              <select
                className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                {fields.map((field) => (
                  <option key={field.name} value={field.name}>
                    {field.name} ({field.type})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('form.value')}>
              <Input value={value} onChange={(event) => setValue(event.target.value)} />
            </Field>
            <Button
              variant="primary"
              onClick={() =>
                void (async () => {
                  if (!bytes || !selected) return
                  dispatch({ type: 'SET_BUSY', busy: true })
                  try {
                    const { fillFormField } = await import('../../lib/pdf/operations')
                    const output = await fillFormField(bytes, selected, value)
                    await replaceBytes(output)
                  } finally {
                    dispatch({ type: 'SET_BUSY', busy: false })
                  }
                })()
              }
            >
              {t('form.fill')}
            </Button>
          </>
        ) : null}
      </div>
    </Panel>
  )
}

function RedactionSection() {
  const { t } = useTranslation()
  const { annotations, commitAnnotations } = usePdf()

  return (
    <Panel title={t('toolkit.redact')}>
      <p className="mb-2 text-xs text-[var(--muted)]">{t('redact.instructions')}</p>
      <Button
        variant="primary"
        disabled={!annotations.some((item) => item.kind === 'redaction')}
        onClick={() => void commitAnnotations()}
      >
        {t('toolkit.apply')}
      </Button>
    </Panel>
  )
}
