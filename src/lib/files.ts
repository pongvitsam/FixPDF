export async function openPdfFile(multiple = false): Promise<File[]> {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const handles = await window.showOpenFilePicker({
        multiple,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      return Promise.all(handles.map(async (handle: FileSystemFileHandle) => handle.getFile()))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return []
      }
      throw error
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf,.pdf'
    input.multiple = multiple
    input.style.display = 'none'
    input.addEventListener('change', () => {
      resolve([...(input.files ?? [])])
      input.remove()
    })
    document.body.appendChild(input)
    input.click()
  })
}

export async function savePdfBytes(bytes: Uint8Array, suggestedName: string) {
  const name = suggestedName.toLowerCase().endsWith('.pdf')
    ? suggestedName
    : `${suggestedName}.pdf`
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
    }
  }

  downloadBlob(blob, name)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function readDroppedPdfFiles(dataTransfer: DataTransfer): Promise<File[]> {
  return [...dataTransfer.files].filter(
    (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
  )
}
