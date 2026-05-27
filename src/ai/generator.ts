import { GENERATE_WORKFLOW_PROMPT } from './prompts'
import type { WorkflowDefinition } from '../engine/executor'
import { randomUUID } from 'crypto'
import { chatCompletion } from './client'

export interface AIConfig {
  provider: string
  modelName: string
  apiKey: string
  baseUrl?: string
}

export class WorkflowGenerator {
  private config: AIConfig

  constructor(config?: Partial<AIConfig>) {
    this.config = {
      provider: config?.provider || 'anthropic',
      modelName: config?.modelName || 'claude-sonnet-4-20250514',
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY || '',
      baseUrl: config?.baseUrl,
    }
  }

  async generate(description: string): Promise<WorkflowDefinition> {
    const response = await chatCompletion(
      this.config,
      GENERATE_WORKFLOW_PROMPT,
      [{ role: 'user', content: description }],
    )

    let jsonStr = response.text
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    return {
      id: randomUUID(),
      name: parsed.name || '未命名流程',
      steps: parsed.steps || [],
      inputs: parsed.inputs || {},
      errorPolicy: parsed.errorPolicy || {
        retryWithAI: true,
        maxAIRetries: 3,
        fallbackToHuman: false,
      },
    }
  }

  async modify(
    existing: WorkflowDefinition,
    feedback: string,
  ): Promise<WorkflowDefinition> {
    const response = await chatCompletion(
      this.config,
      `你是一个 RPA 流程修改专家。用户会给你一个现有流程和修改要求，请输出修改后的完整流程 JSON。\n\n${GENERATE_WORKFLOW_PROMPT}`,
      [{
        role: 'user',
        content: `现有流程:\n\`\`\`json\n${JSON.stringify(existing, null, 2)}\n\`\`\`\n\n修改要求: ${feedback}`,
      }],
    )

    let jsonStr = response.text
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    return {
      ...existing,
      ...parsed,
      id: existing.id,
    }
  }
}
