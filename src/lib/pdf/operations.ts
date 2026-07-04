import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import type { Annotation, FormFieldInfo } from '../../types'
import { renderPageToCanvas, loadPdfDocument } from './viewer'

export async function mergePdfFiles(files: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const bytes of files) {
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const pages = await merged.copyPages(source, source.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }
  return merged.save()
}

export async function splitPdfAllPages(bytes: Uint8Array): Promise<Uint8Array[]> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const outputs: Uint8Array[] = []

  for (const index of source.getPageIndices()) {
    const doc = await PDFDocument.create()
    const [page] = await doc.copyPages(source, [index])
    doc.addPage(page)
    outputs.push(await doc.save())
  }

  return outputs
}

export async function extractPageRange(
  bytes: Uint8Array,
  start: number,
  end: number,
): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const doc = await PDFDocument.create()
  const indices = source
    .getPageIndices()
    .filter((index) => index >= start - 1 && index <= end - 1)
  const pages = await doc.copyPages(source, indices)
  pages.forEach((page) => doc.addPage(page))
  return doc.save()
}

export async function rotateAllPages(bytes: Uint8Array, angle: 90 | 180 | 270) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  doc.getPages().forEach((page) => {
    const current = page.getRotation().angle
    page.setRotation(degrees(current + angle))
  })
  return doc.save()
}

export async function rotatePage(bytes: Uint8Array, pageIndex: number, angle: 90 | 180 | 270) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const page = doc.getPage(pageIndex)
  const current = page.getRotation().angle
  page.setRotation(degrees(current + angle))
  return doc.save()
}

export async function deletePage(bytes: Uint8Array, pageIndex: number) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  doc.removePage(pageIndex)
  return doc.save()
}

export async function duplicatePage(bytes: Uint8Array, pageIndex: number) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const [copy] = await doc.copyPages(doc, [pageIndex])
  doc.insertPage(pageIndex + 1, copy)
  return doc.save()
}

export async function insertBlankPage(bytes: Uint8Array, afterIndex: number) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const ref = doc.getPage(afterIndex)
  const { width, height } = ref.getSize()
  doc.insertPage(afterIndex + 1, [width, height])
  return doc.save()
}

export async function reversePages(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const indices = doc.getPageIndices().reverse()
  const reordered = await PDFDocument.create()
  const pages = await reordered.copyPages(doc, indices)
  pages.forEach((page) => reordered.addPage(page))
  return reordered.save()
}

export async function reorderPages(bytes: Uint8Array, order: number[]) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const reordered = await PDFDocument.create()
  const pages = await reordered.copyPages(doc, order)
  pages.forEach((page) => reordered.addPage(page))
  return reordered.save()
}

export async function addWatermark(bytes: Uint8Array, text: string) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    page.drawText(text, {
      x: width * 0.2,
      y: height * 0.5,
      size: 36,
      font,
      color: rgb(0.75, 0.75, 0.75),
      rotate: degrees(45),
      opacity: 0.35,
    })
  })
  return doc.save()
}

export async function cropMargins(bytes: Uint8Array, margin = 24) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    page.setCropBox(margin, margin, width - margin * 2, height - margin * 2)
  })
  return doc.save()
}

export async function applyAnnotations(bytes: Uint8Array, annotations: Annotation[]) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })

  for (const annotation of annotations) {
    const page = doc.getPage(annotation.pageIndex)
    const { height } = page.getSize()
    const y = height - annotation.y - annotation.height
    const color = parseHexColor(annotation.color)

    if (annotation.kind === 'redaction') {
      page.drawRectangle({
        x: annotation.x,
        y,
        width: annotation.width,
        height: annotation.height,
        color: rgb(0, 0, 0),
      })
      continue
    }

    if (annotation.kind === 'underline') {
      page.drawLine({
        start: { x: annotation.x, y: y + 2 },
        end: { x: annotation.x + annotation.width, y: y + 2 },
        thickness: 2,
        color,
      })
      continue
    }

    if (annotation.kind === 'strikeout') {
      const mid = y + annotation.height / 2
      page.drawLine({
        start: { x: annotation.x, y: mid },
        end: { x: annotation.x + annotation.width, y: mid },
        thickness: 2,
        color,
      })
      continue
    }

    if (annotation.kind === 'note' || annotation.kind === 'text') {
      if (annotation.text) {
        const font = await doc.embedFont(StandardFonts.Helvetica)
        page.drawText(annotation.text, {
          x: annotation.x + 4,
          y: y + annotation.height - 14,
          size: annotation.kind === 'note' ? 10 : 12,
          font,
          color: rgb(0.1, 0.1, 0.1),
        })
      }
      if (annotation.kind === 'note') {
        page.drawRectangle({
          x: annotation.x,
          y,
          width: annotation.width,
          height: annotation.height,
          color,
          opacity: 0.2,
          borderWidth: 1,
          borderColor: color,
        })
      }
      continue
    }

    page.drawRectangle({
      x: annotation.x,
      y,
      width: annotation.width,
      height: annotation.height,
      color,
      opacity: annotation.kind === 'highlight' ? 0.35 : 0.8,
      borderWidth: annotation.kind === 'rectangle' ? 2 : 0,
      borderColor: color,
    })
  }

  return doc.save()
}

export async function listFormFields(bytes: Uint8Array): Promise<FormFieldInfo[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
  return form.getFields().map((field) => ({
    name: field.getName(),
    type: field.constructor.name.replace('PDF', '').replace('Field', ''),
  }))
}

export async function fillFormField(bytes: Uint8Array, name: string, value: string) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
    try {
      form.getTextField(name).setText(value)
    } catch {
      try {
        form.getDropdown(name).select(value)
      } catch {
        const checkbox = form.getCheckBox(name)
        if (value === 'true' || value === '1' || value.toLowerCase() === 'yes') {
          checkbox.check()
        } else {
          checkbox.uncheck()
        }
      }
    }
  form.updateFieldAppearances()
  return doc.save()
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized
  const int = Number.parseInt(value, 16)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}

export async function readPdfMetadata(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return {
    pageCount: doc.getPageCount(),
    title: doc.getTitle() ?? undefined,
    author: doc.getAuthor() ?? undefined,
    subject: doc.getSubject() ?? undefined,
  }
}

export async function decryptPdf(bytes: Uint8Array) {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
    return doc.save()
  } catch {
    return bytes
  }
}

export async function encryptPdf(
  bytes: Uint8Array,
  userPassword: string,
  ownerPassword?: string,
) {
  const plain = await decryptPdf(bytes)
  return encryptPDF(plain, userPassword, ownerPassword ?? userPassword)
}

export async function unlockPasswordProtectedPdf(bytes: Uint8Array, password: string) {
  const { pdf } = await loadPdfDocument(bytes, password)
  const output = await PDFDocument.create()

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex + 1)
    const baseViewport = page.getViewport({ scale: 1 })
    const canvas = document.createElement('canvas')
    await renderPageToCanvas(pdf, pageIndex, 2, canvas)
    const pngBytes = new Uint8Array(
      await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer(),
    )
    const image = await output.embedPng(pngBytes)
    const pdfPage = output.addPage([baseViewport.width, baseViewport.height])
    pdfPage.drawImage(image, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    })
  }

  return output.save()
}

export async function editPdfMetadata(
  bytes: Uint8Array,
  fields: { title?: string; author?: string; subject?: string },
) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  if (fields.title !== undefined) doc.setTitle(fields.title)
  if (fields.author !== undefined) doc.setAuthor(fields.author)
  if (fields.subject !== undefined) doc.setSubject(fields.subject)
  return doc.save()
}

export async function removePdfMetadata(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('')
  doc.setCreator('')
  return doc.save()
}

export async function flattenPdf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = doc.getForm()
  form.flatten()
  return doc.save()
}

export async function splitPdfByInterval(bytes: Uint8Array, interval: number) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const indices = source.getPageIndices()
  const outputs: Uint8Array[] = []

  for (let start = 0; start < indices.length; start += interval) {
    const chunk = indices.slice(start, start + interval)
    const doc = await PDFDocument.create()
    const pages = await doc.copyPages(source, chunk)
    pages.forEach((page) => doc.addPage(page))
    outputs.push(await doc.save())
  }

  return outputs
}

export async function addPageNumbers(bytes: Uint8Array, format = '{n} / {total}') {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const total = doc.getPageCount()

  doc.getPages().forEach((page, index) => {
    const { width } = page.getSize()
    const label = format.replace('{n}', String(index + 1)).replace('{total}', String(total))
    page.drawText(label, {
      x: width / 2 - label.length * 3,
      y: 18,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    })
  })

  return doc.save()
}

export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }

  return doc.save()
}

export async function extractAllText(bytes: Uint8Array, password?: string) {
  const { pdf } = await loadPdfDocument(bytes, password)
  const parts: string[] = []

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex + 1)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(`--- Page ${pageIndex + 1} ---\n${pageText}`)
  }

  return parts.join('\n\n')
}
