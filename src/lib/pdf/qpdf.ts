import createModule, { type QpdfInstance } from '@neslinesli93/qpdf-wasm'

const INPUT_DIR = '/fixpdf_in'
const OUTPUT_DIR = '/fixpdf_out'

type ExtendedFS = QpdfInstance['FS'] & {
  writeFile: (path: string, data: Uint8Array) => void
  unlink: (path: string) => void
}

let instance: QpdfInstance | null = null
let initPromise: Promise<QpdfInstance> | null = null

function wasmUrl() {
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base}qpdf.wasm`
}

export async function getQpdf(): Promise<QpdfInstance> {
  if (instance) return instance
  if (!initPromise) {
    initPromise = createModule({
      locateFile: () => wasmUrl(),
      noInitialRun: true,
    } as Parameters<typeof createModule>[0]).then((mod) => {
      instance = mod
      const fs = mod.FS as ExtendedFS
      try {
        fs.mkdir(INPUT_DIR)
      } catch {
        /* already exists */
      }
      try {
        fs.mkdir(OUTPUT_DIR)
      } catch {
        /* already exists */
      }
      return mod
    })
  }
  return initPromise
}

function newId() {
  return crypto.randomUUID().replace(/-/g, '')
}

async function runQpdfCommand(
  bytes: Uint8Array,
  buildArgs: (inputPath: string, outputPath: string) => string[],
): Promise<Uint8Array> {
  const qpdf = await getQpdf()
  const fs = qpdf.FS as ExtendedFS
  const inputPath = `${INPUT_DIR}/${newId()}.pdf`
  const outputPath = `${OUTPUT_DIR}/${newId()}.pdf`

  fs.writeFile(inputPath, bytes)
  const exitCode = qpdf.callMain(buildArgs(inputPath, outputPath))

  try {
    if (exitCode !== 0) {
      throw new Error(`qpdf exited with code ${exitCode}`)
    }
    return fs.readFile(outputPath)
  } finally {
    try {
      fs.unlink(inputPath)
    } catch {
      /* ignore */
    }
    try {
      fs.unlink(outputPath)
    } catch {
      /* ignore */
    }
  }
}

export async function qpdfDecrypt(bytes: Uint8Array, password?: string) {
  return runQpdfCommand(bytes, (inputPath, outputPath) => {
    const args = [inputPath]
    if (password) args.push(`--password=${password}`)
    args.push('--decrypt', outputPath)
    return args
  })
}

export async function qpdfCompress(bytes: Uint8Array) {
  return runQpdfCommand(bytes, (inputPath, outputPath) => [
    inputPath,
    '--stream-data=compress',
    '--object-streams=generate',
    outputPath,
  ])
}

export async function qpdfLinearize(bytes: Uint8Array) {
  return runQpdfCommand(bytes, (inputPath, outputPath) => [
    inputPath,
    '--linearize',
    outputPath,
  ])
}

export async function qpdfOptimize(bytes: Uint8Array) {
  return runQpdfCommand(bytes, (inputPath, outputPath) => [
    inputPath,
    '--linearize',
    '--stream-data=compress',
    '--object-streams=generate',
    outputPath,
  ])
}

export async function qpdfRemoveRestrictions(bytes: Uint8Array, password?: string) {
  return runQpdfCommand(bytes, (inputPath, outputPath) => {
    const args = [inputPath]
    if (password) args.push(`--password=${password}`)
    args.push('--decrypt', '--remove-restrictions', outputPath)
    return args
  })
}

export async function qpdfStripMetadata(bytes: Uint8Array) {
  return runQpdfCommand(bytes, (inputPath, outputPath) => [
    inputPath,
    '--remove-metadata',
    outputPath,
  ])
}

export function isQpdfAvailable() {
  return typeof WebAssembly !== 'undefined'
}
