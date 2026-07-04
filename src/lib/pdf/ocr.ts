export async function runOcrFromCanvas(canvas: HTMLCanvasElement, lang = 'eng+tha') {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(lang)
  try {
    const result = await worker.recognize(canvas)
    return result.data.text.trim()
  } finally {
    await worker.terminate()
  }
}
