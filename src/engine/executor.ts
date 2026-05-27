import { type Page } from 'playwright-core'
import { Stagehand } from '@browserbasehq/stagehand'
import { randomUUID } from 'crypto'
import { BrowserManager, type BrowserManagerOptions } from './browser'
import { AIRecovery } from '../ai/recovery'
import type { AIConfig } from '../ai/generator'

// 流程步骤类型
export interface WorkflowStep {
  id: string
  type: 'navigate' | 'act' | 'extract' | 'assert' | 'wait' | 'screenshot' | 'click' | 'fill'
  selector?: string
  url?: string
  value?: string
  instruction?: string
  schema?: Record<string, any>
  outputVar?: string
  strategy?: 'selector-first' | 'ai-first'
  timeout?: number
}

export interface WorkflowDefinition {
  id: string
  name: string
  steps: WorkflowStep[]
  inputs: Record<string, { type: string; required: boolean; default?: any }>
  errorPolicy: {
    retryWithAI: boolean
    maxAIRetries: number
    fallbackToHuman: boolean
  }
}

interface StepLog {
  stepId: string
  stepType: string
  status: 'success' | 'failed' | 'skipped'
  startedAt: number
  finishedAt: number
  duration: number
  error?: string
  screenshot?: string
  output?: any
}

interface ExecutionResult {
  id: string
  workflowId: string
  status: 'success' | 'failed' | 'partial'
  stepLogs: StepLog[]
  aiPatches: any[]
  outputs: Record<string, any>
  startedAt: Date
  finishedAt?: Date
  duration?: number
}

export type ExecutionCallback = (event: {
  type: 'step:start' | 'step:success' | 'step:error' | 'ai:fixing' | 'execution:done'
  stepId?: string
  data?: any
}) => void

export class WorkflowExecutor {
  private browserManager: BrowserManager
  private aiRecovery: AIRecovery
  private executionId: string
  private stepLogs: StepLog[] = []
  private aiPatches: any[] = []
  private outputs: Record<string, any> = {}
  private callback?: ExecutionCallback

  constructor(browserOptions: BrowserManagerOptions = {}, aiConfig?: Partial<AIConfig>) {
    this.browserManager = new BrowserManager(browserOptions)
    this.aiRecovery = new AIRecovery(aiConfig)
    this.executionId = randomUUID()
  }

  onEvent(callback: ExecutionCallback) {
    this.callback = callback
  }

  async execute(workflow: WorkflowDefinition, inputs: Record<string, any> = {}): Promise<ExecutionResult> {
    const startedAt = new Date()
    const mergedInputs = this.mergeInputs(workflow.inputs, inputs)

    try {
      await this.browserManager.connect()

      const pages = await this.browserManager.getPages()
      const page = pages[0] || await this.browserManager.newPage()
      const stagehand = await this.browserManager.createStagehand(page)

      for (const step of workflow.steps) {
        await this.executeStep(step, stagehand, page, mergedInputs, workflow.errorPolicy)
      }

      return {
        id: this.executionId,
        workflowId: workflow.id,
        status: 'success',
        stepLogs: this.stepLogs,
        aiPatches: this.aiPatches,
        outputs: this.outputs,
        startedAt,
        finishedAt: new Date(),
        duration: Date.now() - startedAt.getTime(),
      }
    } catch (error) {
      return {
        id: this.executionId,
        workflowId: workflow.id,
        status: 'failed',
        stepLogs: this.stepLogs,
        aiPatches: this.aiPatches,
        outputs: this.outputs,
        startedAt,
        finishedAt: new Date(),
        duration: Date.now() - startedAt.getTime(),
      }
    } finally {
      await this.browserManager.disconnect()
    }
  }

  private async executeStep(
    step: WorkflowStep,
    stagehand: Stagehand,
    page: Page,
    inputs: Record<string, any>,
    errorPolicy: WorkflowDefinition['errorPolicy']
  ) {
    const log: StepLog = {
      stepId: step.id,
      stepType: step.type,
      status: 'success',
      startedAt: Date.now(),
      finishedAt: 0,
      duration: 0,
    }

    this.emit('step:start', step.id)

    try {
      switch (step.type) {
        case 'navigate':
          await page.goto(this.interpolate(step.url!, inputs))
          break

        case 'act':
          await stagehand.act({
            action: this.interpolate(step.instruction!, inputs),
          })
          break

        case 'click':
          await this.executeWithFallback(
            step,
            () => page.click(step.selector!),
            async () => {
              await stagehand.act({ action: step.instruction || `点击 ${step.selector}` })
            },
          )
          break

        case 'fill':
          await this.executeWithFallback(
            step,
            () => page.fill(step.selector!, this.interpolate(step.value!, inputs)),
            async () => {
              await stagehand.act({
                action: step.instruction || `在输入框中填入 ${step.value}`,
              })
            },
          )
          break

        case 'extract':
          const extracted = await stagehand.extract({
            instruction: this.interpolate(step.instruction!, inputs),
            schema: step.schema as any,
          })
          if (step.outputVar) {
            this.outputs[step.outputVar] = extracted
          }
          log.output = extracted
          break

        case 'assert':
          const observed = await stagehand.observe({ instruction: step.instruction! })
          if (!observed || (Array.isArray(observed) && observed.length === 0)) {
            throw new Error(`断言失败: ${step.instruction}`)
          }
          break

        case 'wait':
          if (step.selector) {
            await page.waitForSelector(step.selector, {
              timeout: step.timeout || 10000,
            })
          } else {
            await new Promise(r => setTimeout(r, step.timeout || 3000))
          }
          break

        case 'screenshot':
          const screenshotBuffer = await page.screenshot()
          const screenshotBase64 = screenshotBuffer.toString('base64')
          if (step.outputVar) {
            this.outputs[step.outputVar] = screenshotBase64
          }
          log.screenshot = screenshotBase64
          break

        default:
          throw new Error(`未知步骤类型: ${(step as any).type}`)
      }

      log.finishedAt = Date.now()
      log.duration = log.finishedAt - log.startedAt
      this.stepLogs.push(log)
      this.emit('step:success', step.id, { duration: log.duration })
    } catch (error) {
      log.finishedAt = Date.now()
      log.duration = log.finishedAt - log.startedAt
      log.error = error instanceof Error ? error.message : String(error)

      try {
        const screenshotBuffer = await page.screenshot()
        log.screenshot = screenshotBuffer.toString('base64')
      } catch {}

      this.emit('step:error', step.id, { error: log.error })

      if (errorPolicy.retryWithAI) {
        const fixed = await this.attemptAIRecovery(step, error as Error, stagehand, page)
        if (fixed) {
          log.status = 'success'
          log.error = undefined
          this.stepLogs.push(log)
          return
        }
      }

      log.status = 'failed'
      this.stepLogs.push(log)
      throw error
    }
  }

  private async executeWithFallback(
    step: WorkflowStep,
    selectorFn: () => Promise<void>,
    aiFn: () => Promise<void>,
  ) {
    if (step.strategy === 'ai-first') {
      try {
        await aiFn()
      } catch {
        if (step.selector) await selectorFn()
        else throw new Error('AI 操作失败且无选择器兜底')
      }
      return
    }

    if (step.selector) {
      try {
        await selectorFn()
        return
      } catch {}
    }

    if (step.instruction) {
      await aiFn()
    } else {
      throw new Error(`步骤 ${step.id} 既无选择器也无 AI 指令`)
    }
  }

  private async attemptAIRecovery(
    failedStep: WorkflowStep,
    error: Error,
    stagehand: Stagehand,
    page: Page,
  ): Promise<boolean> {
    this.emit('ai:fixing', failedStep.id)

    try {
      const screenshotBuffer = await page.screenshot()
      const screenshot = screenshotBuffer.toString('base64')
      const pageUrl = page.url()
      const pageTitle = await page.title()

      const recovery = await this.aiRecovery.analyze({
        failedStep,
        error,
        screenshot,
        pageInfo: { url: pageUrl, title: pageTitle },
      })

      if (recovery.action === 'skip') {
        return true
      }

      if (recovery.action === 'retry') {
        if (recovery.fixedInstruction) {
          await stagehand.act({ action: recovery.fixedInstruction })
        }
        this.aiPatches.push({
          stepId: failedStep.id,
          original: failedStep.instruction || failedStep.selector,
          fixed: recovery.fixedInstruction,
          reason: recovery.reason,
        })
        return true
      }

      return false
    } catch {
      return false
    }
  }

  private mergeInputs(
    definitions: WorkflowDefinition['inputs'],
    provided: Record<string, any>,
  ): Record<string, any> {
    const merged: Record<string, any> = {}
    for (const [key, def] of Object.entries(definitions)) {
      if (key in provided) {
        merged[key] = provided[key]
      } else if (def.default !== undefined) {
        merged[key] = def.default
      } else if (def.required) {
        throw new Error(`缺少必需参数: ${key}`)
      }
    }
    return merged
  }

  private interpolate(template: string, inputs: Record<string, any>): string {
    return template.replace(/\$\{([^}]+)\}/g, (_, path) => {
      const parts = path.split('.')
      let value: any = inputs
      for (const part of parts) {
        value = value?.[part]
      }
      return value !== undefined ? String(value) : path
    })
  }

  private emit(type: string, stepId?: string, data?: any) {
    this.callback?.({ type: type as any, stepId, data })
  }
}
