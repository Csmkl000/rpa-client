import Anthropic from '@anthropic-ai/sdk'
import { RECOVERY_PROMPT } from './prompts'
import type { WorkflowStep } from '../engine/executor'

interface RecoveryContext {
  failedStep: WorkflowStep
  error: Error
  screenshot: string // base64
  pageInfo: { url: string; title: string }
}

interface RecoveryResult {
  action: 'retry' | 'skip' | 'abort'
  fixedInstruction?: string
  reason: string
}

export class AIRecovery {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    })
  }

  async analyze(context: RecoveryContext): Promise<RecoveryResult> {
    const stepDescription = JSON.stringify({
      type: context.failedStep.type,
      selector: context.failedStep.selector,
      instruction: context.failedStep.instruction,
      url: context.failedStep.url,
      value: context.failedStep.value,
    }, null, 2)

    const userContent = `## 失败的步骤
\`\`\`json
${stepDescription}
\`\`\`

## 错误信息
${context.error.message}

## 当前页面
- URL: ${context.pageInfo.url}
- 标题: ${context.pageInfo.title}

## 页面截图
已附上截图，请分析页面当前状态。`

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: RECOVERY_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userContent },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: context.screenshot,
              },
            },
          ],
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return { action: 'abort', reason: 'AI 返回了非文本内容' }
    }

    let jsonStr = content.text
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    try {
      const parsed = JSON.parse(jsonStr) as RecoveryResult
      return {
        action: parsed.action || 'abort',
        fixedInstruction: parsed.fixedInstruction,
        reason: parsed.reason || '未知原因',
      }
    } catch {
      return { action: 'abort', reason: 'AI 返回内容无法解析' }
    }
  }
}
