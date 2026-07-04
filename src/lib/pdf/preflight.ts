import { listFormFields, readPdfMetadata } from './operations'
import { loadAttachments, loadBookmarks } from './catalog'
import { pdfiumReadMetadata } from './pdfium'
import { loadPdfDocument } from './viewer'

export type PreflightCheck = {
  id: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

export async function runPreflight(bytes: Uint8Array, password?: string): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = []

  try {
    const { pdf, encrypted } = await loadPdfDocument(bytes, password)
    checks.push({
      id: 'open',
      status: 'pass',
      message: `Document opens (${pdf.numPages} pages)`,
    })
    if (encrypted) {
      checks.push({
        id: 'encrypted',
        status: 'warn',
        message: 'Document is encrypted or restricted',
      })
    } else {
      checks.push({ id: 'encrypted', status: 'pass', message: 'No encryption detected' })
    }

    const meta = await readPdfMetadata(bytes)
    if (meta.title || meta.author) {
      checks.push({ id: 'metadata', status: 'pass', message: 'Document metadata present' })
    } else {
      checks.push({ id: 'metadata', status: 'warn', message: 'Missing title/author metadata' })
    }

    const fields = await listFormFields(bytes)
    checks.push({
      id: 'forms',
      status: fields.length > 0 ? 'warn' : 'pass',
      message: fields.length > 0 ? `${fields.length} form field(s) found` : 'No interactive forms',
    })

    const bookmarks = await loadBookmarks(bytes, password)
    checks.push({
      id: 'bookmarks',
      status: bookmarks.length > 0 ? 'pass' : 'warn',
      message:
        bookmarks.length > 0
          ? `${bookmarks.length} top-level bookmark(s)`
          : 'No bookmarks/outline',
    })

    const attachments = await loadAttachments(bytes, password)
    checks.push({
      id: 'attachments',
      status: attachments.length > 0 ? 'pass' : 'pass',
      message:
        attachments.length > 0
          ? `${attachments.length} embedded attachment(s)`
          : 'No embedded attachments',
    })

    let textPages = 0
    for (let i = 0; i < Math.min(pdf.numPages, 5); i += 1) {
      const page = await pdf.getPage(i + 1)
      const content = await page.getTextContent()
      const text = content.items.map((item) => ('str' in item ? item.str : '')).join('')
      if (text.trim().length > 10) textPages += 1
    }
    checks.push({
      id: 'text',
      status: textPages > 0 ? 'pass' : 'warn',
      message:
        textPages > 0
          ? `Text layer detected (sampled ${Math.min(pdf.numPages, 5)} pages)`
          : 'Little or no extractable text (may be scanned)',
    })
  } catch (error) {
    checks.push({
      id: 'open',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Failed to open document',
    })
    return checks
  }

  try {
    const pdfiumMeta = await pdfiumReadMetadata(bytes, password)
    checks.push({
      id: 'pdfium',
      status: 'pass',
      message: `PDFium engine OK (${pdfiumMeta.pageCount} pages)`,
    })
  } catch {
    checks.push({
      id: 'pdfium',
      status: 'warn',
      message: 'PDFium engine could not validate document',
    })
  }

  if (bytes.byteLength > 50 * 1024 * 1024) {
    checks.push({
      id: 'size',
      status: 'warn',
      message: `Large file (${(bytes.byteLength / (1024 * 1024)).toFixed(1)} MB)`,
    })
  } else {
    checks.push({
      id: 'size',
      status: 'pass',
      message: `File size ${(bytes.byteLength / 1024).toFixed(1)} KB`,
    })
  }

  return checks
}
