import { loadPdfDocument } from './viewer'

export type BookmarkNode = {
  title: string
  pageIndex: number
  children: BookmarkNode[]
}

export type AttachmentInfo = {
  name: string
  size: number
  mimeType?: string
}

export async function loadBookmarks(
  bytes: Uint8Array,
  password?: string,
): Promise<BookmarkNode[]> {
  const { pdf } = await loadPdfDocument(bytes, password)
  const outline = await pdf.getOutline()
  if (!outline) return []

  const mapNode = async (
    item: {
      title: string
      dest?: string | Array<unknown> | null
      items?: Array<{ title: string; dest?: string | Array<unknown> | null; items?: unknown[] }>
    },
  ): Promise<BookmarkNode> => {
    let pageIndex = 0
    if (item.dest && Array.isArray(item.dest) && typeof item.dest[0] === 'object') {
      try {
        const ref = item.dest[0] as { num: number; gen: number }
        pageIndex = await pdf.getPageIndex(ref)
      } catch {
        pageIndex = 0
      }
    }
    const children = item.items
      ? await Promise.all(item.items.map((child) => mapNode(child as typeof item)))
      : []
    return { title: item.title, pageIndex, children }
  }

  return Promise.all(outline.map((item) => mapNode(item)))
}

export async function loadAttachments(
  bytes: Uint8Array,
  password?: string,
): Promise<AttachmentInfo[]> {
  const { pdf } = await loadPdfDocument(bytes, password)
  const attachments = await pdf.getAttachments()
  if (!attachments) return []

  return [...attachments.entries()].map(([name, file]) => ({
    name,
    size: file.content?.byteLength ?? 0,
    mimeType: file.content ? guessMime(name) : undefined,
  }))
}

function guessMime(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

export async function downloadAttachment(
  bytes: Uint8Array,
  name: string,
  password?: string,
) {
  const { pdf } = await loadPdfDocument(bytes, password)
  const attachments = await pdf.getAttachments()
  const file = attachments?.get(name)
  if (!file?.content) throw new Error('Attachment not found')
  return new Blob([file.content.slice()], { type: guessMime(name) })
}
