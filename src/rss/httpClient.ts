/**
 * Shared fetch queue with retry: bounds concurrency and rate to avoid 429s.
 * Ported from OpenBook's queue.js / http.js.
 */

export interface FetchQueueOptions {
  concurrency: number
  intervalCap: number
  intervalMs: number
}

export interface FetchOptions extends RequestInit {
  /** Timeout for the whole attempt, in milliseconds. */
  timeoutMs?: number
  /** Retry count (default 3). */
  retries?: number
}

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly url?: string,
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * A rate-limited, concurrency-bounded fetch scheduler with exponential
 * backoff retry on 429 / 5xx / network errors.
 */
export class FetchQueue {
  private readonly pending: (() => void)[] = []
  private running = 0
  private windowCount = 0
  private windowStart = Date.now()

  constructor(private readonly options: FetchQueueOptions) {}

  /** Run a task through the queue; resolves with the task's result. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.running -= 1
      this.next()
    }
  }

  private acquire(): Promise<void> {
    return new Promise(resolve => {
      this.pending.push(resolve)
      this.pump()
    })
  }

  private next(): void {
    this.pump()
  }

  private pump(): void {
    while (this.running < this.options.concurrency && this.pending.length > 0) {
      const slot = this.options.intervalCap > 0 && this.windowCount >= this.options.intervalCap
      if (slot) {
        const elapsed = Date.now() - this.windowStart
        if (elapsed < this.options.intervalMs) return
        this.windowCount = 0
        this.windowStart = Date.now()
      }
      const task = this.pending.shift()
      if (task === undefined) return
      this.running += 1
      this.windowCount += 1
      task()
    }
  }
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * One fetch attempt with a timeout.
 */
async function fetchOnce(url: string, options: FetchOptions): Promise<Response> {
  const { timeoutMs, retries: _retries, ...init } = options
  const controller = new AbortController()
  const timer = timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      const error = new FetchError(`HTTP ${res.status}`, res.status, url)
      throw error
    }
    return res
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Queue + retry wrapper around fetch. Non-2xx responses throw FetchError
 * carrying the status code; 304 is surfaced as a FetchError with status 304.
 */
export async function queuedFetch(queue: FetchQueue, url: string, options: FetchOptions = {}): Promise<Response> {
  const retries = options.retries ?? 3
  const baseDelayMs = 800
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await queue.run(() => fetchOnce(url, options))
    } catch (error) {
      lastError = error
      const status = (error as FetchError).status
      const shouldRetry = status === 429 || (status !== undefined && status >= 500 && status <= 599) || status === undefined
      if (!shouldRetry || attempt === retries) break
      await sleep(baseDelayMs * 2 ** attempt)
    }
  }
  throw lastError
}
