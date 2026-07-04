import UTIF from 'utif2'

export async function canvasToBmpBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  const { width, height } = canvas
  const imageData = context.getImageData(0, 0, width, height)
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, -height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelDataSize, true)

  let offset = 54
  const rgba = imageData.data
  for (let y = 0; y < height; y += 1) {
    let rowWritten = 0
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      bufferBytes(buffer, offset, rgba[index + 2])
      bufferBytes(buffer, offset + 1, rgba[index + 1])
      bufferBytes(buffer, offset + 2, rgba[index])
      offset += 3
      rowWritten += 3
    }
    const padding = rowSize - rowWritten
    for (let pad = 0; pad < padding; pad += 1) {
      bufferBytes(buffer, offset, 0)
      offset += 1
    }
  }

  return new Blob([buffer], { type: 'image/bmp' })
}

export async function canvasToTiffBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas context unavailable')

  const { width, height } = canvas
  const rgba = new Uint8Array(context.getImageData(0, 0, width, height).data)
  const tiff = UTIF.encodeImage(rgba, width, height)
  return new Blob([tiff], { type: 'image/tiff' })
}

function bufferBytes(buffer: ArrayBuffer, offset: number, value: number) {
  new Uint8Array(buffer)[offset] = value
}
