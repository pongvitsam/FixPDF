import html2canvas from 'html2canvas'
import mammoth from 'mammoth'
import { PDFDocument } from 'pdf-lib'

async function rasterizeHtmlToPdf(html: string): Promise<Uint8Array> {
  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;padding:40px;background:#fff;color:#111;font-family:Georgia,serif;font-size:12pt;line-height:1.6;'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })
    const pngBytes = new Uint8Array(
      await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer(),
    )
    const doc = await PDFDocument.create()
    const image = await doc.embedPng(pngBytes)
    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
    return doc.save()
  } finally {
    document.body.removeChild(container)
  }
}

export async function docxToPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return rasterizeHtmlToPdf(result.value)
}

export async function htmlFileToPdf(file: File): Promise<Uint8Array> {
  const html = await file.text()
  return rasterizeHtmlToPdf(html)
}

export async function htmlStringToPdf(html: string): Promise<Uint8Array> {
  return rasterizeHtmlToPdf(html)
}
