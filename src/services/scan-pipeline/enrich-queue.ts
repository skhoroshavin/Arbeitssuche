import type { Vacancy } from "@/models/vacancy/index.js"
import type {
  VacancyEnricher,
  EnrichContext,
} from "@/services/vacancy-enricher/index.js"
import { isAbortError } from "@/utils"

export class EnrichQueue {
  constructor(options: EnrichQueueOptions) {
    this.enricher = options.enricher
    this.context = options.context
    this.concurrency = options.concurrency ?? 2
    this.onEnriched = options.onEnriched
    this.onError = options.onError
    this.onProgress = options.onProgress
    this.signal = options.signal
  }

  submit(vacancy: Vacancy, hash: string): void {
    if (this.signal?.aborted) return
    this._total++
    if (this.running < this.concurrency) {
      this.startTask(vacancy, hash)
    } else {
      this.queue.push({ vacancy, hash })
    }
  }

  drain(): Promise<void> {
    if (this.signal?.aborted) {
      return Promise.reject(createAbortError())
    }
    if (this.running === 0 && this.queue.length === 0) {
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      this.drainResolve = resolve
      this.drainReject = reject
    })
  }

  abort(): void {
    this.queue = []
  }

  get pending(): number {
    return this.queue.length
  }

  get completed(): number {
    return this._completed
  }

  get total(): number {
    return this._total
  }

  private processNext(): void {
    if (this.signal?.aborted) {
      this.queue = []
      if (this.running === 0) {
        this.finishDrain(createAbortError())
      }
      return
    }

    const next = this.queue.shift()
    if (next) {
      this.startTask(next.vacancy, next.hash)
    } else if (this.running === 0) {
      this.finishDrain()
    }
  }

  private finishDrain(error?: unknown): void {
    if (error) {
      this.drainReject?.(error)
    } else {
      this.drainResolve?.()
    }

    this.drainResolve = undefined
    this.drainReject = undefined
  }

  private startTask(vacancy: Vacancy, hash: string): void {
    this.running++
    this.enricher
      .enrich(vacancy, this.context, this.signal)
      .then((enriched) => {
        if (!this.signal?.aborted) {
          this.onEnriched(enriched, hash)
        }
      })
      .catch((error: unknown) => {
        if (this.signal?.aborted && isAbortError(error)) {
          return
        }
        this.onError(
          hash,
          error instanceof Error ? error : new Error(String(error)),
        )
      })
      .finally(() => {
        this._completed++
        this.running--
        this.onProgress?.({ completed: this._completed, total: this._total })
        this.processNext()
      })
  }

  private readonly enricher: VacancyEnricher
  private readonly context: EnrichContext
  private readonly concurrency: number
  private readonly onEnriched: (vacancy: Vacancy, hash: string) => void
  private readonly onError: (hash: string, error: Error) => void
  private readonly onProgress?: (event: EnrichProgressEvent) => void
  private readonly signal?: AbortSignal
  private queue: Array<{ vacancy: Vacancy; hash: string }> = []
  private running = 0
  private _completed = 0
  private _total = 0
  private drainResolve?: () => void
  private drainReject?: (error: unknown) => void
}

interface EnrichQueueOptions {
  enricher: VacancyEnricher
  context: EnrichContext
  concurrency?: number
  onEnriched: (vacancy: Vacancy, hash: string) => void
  onError: (hash: string, error: Error) => void
  onProgress?: (event: EnrichProgressEvent) => void
  signal?: AbortSignal
}

interface EnrichProgressEvent {
  completed: number
  total: number
}

function createAbortError(): DOMException {
  return new DOMException("Aborted", "AbortError")
}
