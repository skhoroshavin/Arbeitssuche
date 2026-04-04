import type { Vacancy } from "@/models/vacancy/index.js"
import type {
  VacancyEnricher,
  EnrichContext,
} from "@/services/vacancy-enricher/index.js"

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
    this._total++
    if (this.running < this.concurrency) {
      this.startTask(vacancy, hash)
    } else {
      this.queue.push({ vacancy, hash })
    }
  }

  drain(): Promise<void> {
    if (this.running === 0 && this.queue.length === 0) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.drainResolve = resolve
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

  // eslint-disable-next-line unslop/read-friendly-order
  private processNext(): void {
    if (this.signal?.aborted) this.queue = []
    const next = this.queue.shift()
    if (next) {
      this.startTask(next.vacancy, next.hash)
    } else if (this.running === 0) {
      this.drainResolve?.()
      this.drainResolve = undefined
    }
  }

  private startTask(vacancy: Vacancy, hash: string): void {
    this.running++
    this.enricher
      .enrich(vacancy, this.context)
      .then((enriched) => {
        this.onEnriched(enriched, hash)
      })
      .catch((error: unknown) => {
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
