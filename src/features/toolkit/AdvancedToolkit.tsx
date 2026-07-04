import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileImage,
  FileText,
  FileType2,
  Hash,
  ImagePlus,
  Layers2,
  Minimize2,
  Rocket,
  Scan,
  Scissors,
  Trash2,
  Zap,
} from 'lucide-react'
import { Button, Field, Input, Panel } from '../../components/ui'
import { downloadBlob } from '../../lib/files'
import { showToast } from '../../components/Toast'
import { usePdf, usePdfDispatch } from '../../context/PdfContext'
import { pdfiumExtractText, pdfiumRenderPagePng } from '../../lib/pdf/pdfium'
import {
  addPageNumbers,
  compressPdf,
  extractAllText,
  flattenPdf,
  imagesToPdf,
  linearizePdf,
  optimizePdf,
  removePdfMetadata,
  splitPdfByInterval,
  editPdfMetadata,
  stripMetadataQpdf,
} from '../../lib/pdf/operations'
import { docxToPdf, htmlFileToPdf } from '../../lib/pdf/convert'
import { loadPdfDocument, renderPageToImage } from '../../lib/pdf/viewer'

export function AdvancedToolkit() {
  const { t } = useTranslation()
  const { bytes, fileName, pdfPassword, currentPage, replaceBytes } = usePdf()
  const dispatch = usePdfDispatch()
  const [interval, setInterval] = useState('5')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [subject, setSubject] = useState('')
  const [extractedText, setExtractedText] = useState('')

  const run = async (task: () => Promise<void>) => {
    dispatch({ type: 'SET_BUSY', busy: true, message: t('app.processing') })
    try {
      await task()
    } catch {
      showToast('toast.error')
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false })
    }
  }

  const pickImages = () =>
    new Promise<File[]>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/png,image/jpeg,.png,.jpg,.jpeg'
      input.multiple = true
      input.onchange = () => resolve([...(input.files ?? [])])
      input.click()
    })

  const pickDocx = () =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })

  const pickHtml = () =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.html,.htm,text/html'
      input.onchange = () => resolve(input.files?.[0] ?? null)
      input.click()
    })

  return (
    <div className="space-y-3">
      <Panel title={t('toolkit.convertTitle')}>
        <p className="mb-3 text-xs text-[var(--muted)]">{t('toolkit.convertHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              void run(async () => {
                const file = await pickDocx()
                if (!file) return
                const output = await docxToPdf(file)
                await replaceBytes(output, file.name.replace(/\.docx$/i, '.pdf'))
                showToast('toast.converted')
              })
            }
          >
            <FileType2 className="size-4" /> {t('toolkit.wordToPdf')}
          </Button>
          <Button
            onClick={() =>
              void run(async () => {
                const file = await pickHtml()
                if (!file) return
                const output = await htmlFileToPdf(file)
                await replaceBytes(output, file.name.replace(/\.html?$/i, '.pdf'))
                showToast('toast.converted')
              })
            }
          >
            <FileText className="size-4" /> {t('toolkit.htmlToPdf')}
          </Button>
        </div>
      </Panel>

      <Panel title={t('toolkit.pdfiumTitle')}>
        <p className="mb-3 text-xs text-[var(--muted)]">{t('toolkit.pdfiumHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const text = await pdfiumExtractText(bytes, pdfPassword ?? undefined)
                setExtractedText(text)
                downloadBlob(new Blob([text], { type: 'text/plain' }), `${fileName.replace(/\.pdf$/i, '')}-pdfium.txt`)
              })
            }
          >
            <Scan className="size-4" /> {t('toolkit.pdfiumExtract')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const png = await pdfiumRenderPagePng(bytes, currentPage, pdfPassword ?? undefined)
                downloadBlob(new Blob([png.slice()], { type: 'image/png' }), `${fileName.replace(/\.pdf$/i, '')}-pdfium-p${currentPage + 1}.png`)
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.pdfiumRender')}
          </Button>
        </div>
      </Panel>

      <Panel title={t('toolkit.wasmTitle')}>
        <p className="mb-3 text-xs text-[var(--muted)]">{t('toolkit.wasmHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await compressPdf(bytes)
                await replaceBytes(output)
                showToast('toast.compressed')
              })
            }
          >
            <Minimize2 className="size-4" /> {t('toolkit.compress')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await linearizePdf(bytes)
                await replaceBytes(output)
              })
            }
          >
            <Rocket className="size-4" /> {t('toolkit.linearize')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await optimizePdf(bytes)
                await replaceBytes(output)
                showToast('toast.optimized')
              })
            }
          >
            <Zap className="size-4" /> {t('toolkit.optimize')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await stripMetadataQpdf(bytes)
                await replaceBytes(output)
              })
            }
          >
            <Trash2 className="size-4" /> {t('toolkit.stripMetadata')}
          </Button>
        </div>
      </Panel>

      <Panel title={t('toolkit.advanced')}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const parts = await splitPdfByInterval(bytes, Math.max(1, Number(interval)))
                parts.forEach((part, index) =>
                  downloadBlob(
                    new Blob([part.slice()], { type: 'application/pdf' }),
                    `${fileName.replace(/\.pdf$/i, '')}-part-${index + 1}.pdf`,
                  ),
                )
                showToast('toast.split')
              })
            }
          >
            <Scissors className="size-4" /> {t('toolkit.splitInterval')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await flattenPdf(bytes)
                await replaceBytes(output)
              })
            }
          >
            <Layers2 className="size-4" /> {t('toolkit.flatten')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await addPageNumbers(bytes)
                await replaceBytes(output)
              })
            }
          >
            <Hash className="size-4" /> {t('toolkit.pageNumbers')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await removePdfMetadata(bytes)
                await replaceBytes(output)
              })
            }
          >
            <Trash2 className="size-4" /> {t('toolkit.removeMetadata')}
          </Button>
          <Button
            onClick={() =>
              void run(async () => {
                const files = await pickImages()
                if (!files.length) return
                const output = await imagesToPdf(files)
                await replaceBytes(output, 'images.pdf')
              })
            }
          >
            <ImagePlus className="size-4" /> {t('toolkit.imagesToPdf')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const text = await extractAllText(bytes, pdfPassword ?? undefined)
                setExtractedText(text)
                downloadBlob(new Blob([text], { type: 'text/plain' }), `${fileName.replace(/\.pdf$/i, '')}.txt`)
              })
            }
          >
            <FileText className="size-4" /> {t('toolkit.extractText')}
          </Button>
          <Button
            disabled={!bytes}
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const { pdf } = await loadPdfDocument(bytes, pdfPassword ?? undefined)
                for (let index = 0; index < pdf.numPages; index += 1) {
                  const png = await renderPageToImage(pdf, index, 2, 'image/png')
                  downloadBlob(png, `${fileName.replace(/\.pdf$/i, '')}-p${index + 1}.png`)
                }
              })
            }
          >
            <FileImage className="size-4" /> {t('toolkit.exportAllPng')}
          </Button>
        </div>
        <Field label={t('toolkit.splitIntervalSize')}>
          <Input value={interval} onChange={(event) => setInterval(event.target.value)} />
        </Field>
      </Panel>

      <Panel title={t('toolkit.editMetadata')}>
        <div className="space-y-2">
          <Field label={t('metadata.titleLabel')}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label={t('metadata.authorLabel')}>
            <Input value={author} onChange={(event) => setAuthor(event.target.value)} />
          </Field>
          <Field label={t('metadata.subjectLabel')}>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </Field>
          <Button
            disabled={!bytes}
            variant="primary"
            onClick={() =>
              void run(async () => {
                if (!bytes) return
                const output = await editPdfMetadata(bytes, { title, author, subject })
                await replaceBytes(output)
              })
            }
          >
            {t('toolkit.apply')}
          </Button>
        </div>
      </Panel>

      {extractedText ? (
        <Panel title={t('toolkit.extractText')}>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{extractedText}</pre>
        </Panel>
      ) : null}
    </div>
  )
}
