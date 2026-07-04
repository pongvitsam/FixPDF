type PasswordRequest = {
  reason: number
  resolve: (password: string | null) => void
}

let pending: PasswordRequest | null = null
let listener: ((request: PasswordRequest | null) => void) | null = null

export function subscribePasswordPrompt(handler: (request: PasswordRequest | null) => void) {
  listener = handler
  if (pending) handler(pending)
  return () => {
    if (listener === handler) listener = null
  }
}

export function requestPassword(reason: number): Promise<string | null> {
  return new Promise((resolve) => {
    pending = { reason, resolve }
    listener?.(pending)
  })
}

export function submitPassword(password: string) {
  pending?.resolve(password)
  pending = null
  listener?.(null)
}

export function cancelPasswordRequest() {
  pending?.resolve(null)
  pending = null
  listener?.(null)
}
