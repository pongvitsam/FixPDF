import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import type { Annotation, FormFieldInfo } from '../../types'

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

    const color = parseHexColor(annotation.color)
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

    if (annotation.text) {
      const font = await doc.embedFont(StandardFonts.Helvetica)
      page.drawText(annotation.text, {
        x: annotation.x + 4,
        y: y + annotation.height - 14,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
    }
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
      form.getCheckBox(name).check()
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
