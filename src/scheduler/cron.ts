import { Cron, type CronOptions } from 'croner'

export interface ScheduleJob {
  id: string
  workflowId: string
  cron: string
  inputs: Record<string, any>
  enabled: boolean
}

export type ScheduleCallback = (job: ScheduleJob) => Promise<void>

export class CronScheduler {
  private jobs: Map<string, Cron> = new Map()
  private callback?: ScheduleCallback

  onTick(callback: ScheduleCallback) {
    this.callback = callback
  }

  add(job: ScheduleJob) {
    if (!job.enabled) return

    const cron = new Cron(job.cron, async () => {
      if (this.callback) {
        await this.callback(job)
      }
    })

    this.jobs.set(job.id, cron)
    console.log(`定时任务已添加: ${job.id} (${job.cron})`)
  }

  remove(jobId: string) {
    const cron = this.jobs.get(jobId)
    if (cron) {
      cron.stop()
      this.jobs.delete(jobId)
      console.log(`定时任务已移除: ${jobId}`)
    }
  }

  pause(jobId: string) {
    const cron = this.jobs.get(jobId)
    if (cron) {
      cron.pause()
    }
  }

  resume(jobId: string) {
    const cron = this.jobs.get(jobId)
    if (cron) {
      cron.resume()
    }
  }

  list(): string[] {
    return Array.from(this.jobs.keys())
  }

  stopAll() {
    for (const cron of this.jobs.values()) {
      cron.stop()
    }
    this.jobs.clear()
  }
}
