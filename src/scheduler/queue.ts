import PQueue from 'p-queue'

export interface TaskOptions {
  priority?: number
  timeout?: number
}

export class TaskQueue {
  private queue: PQueue

  constructor(concurrency = 2) {
    this.queue = new PQueue({ concurrency })
  }

  async add<T>(fn: () => Promise<T>, options?: TaskOptions): Promise<T> {
    return this.queue.add(fn, {
      priority: options?.priority,
      timeout: options?.timeout,
    }) as Promise<T>
  }

  get size() {
    return this.queue.size
  }

  get pending() {
    return this.queue.pending
  }

  async onIdle() {
    return this.queue.onIdle()
  }

  clear() {
    this.queue.clear()
  }

  pause() {
    this.queue.pause()
  }

  start() {
    this.queue.start()
  }
}
