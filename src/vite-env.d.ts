/// <reference types="vite/client" />

interface FilePickerAcceptType {
  description?: string
  accept: Record<string, string | string[]>
}

interface FilePickerOptions {
  multiple?: boolean
  types?: FilePickerAcceptType[]
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
  name: string
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}

interface Window {
  showOpenFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
}
