import Anthropic from '@anthropic-ai/sdk'
import { GENERATE_WORKFLOW_PROMPT } from './prompts'
import type { WorkflowDefinition } from '../engine/executor'
import { randomUUID } from 'crypto'

export interface AIConfig {
  provider: string
  modelName: string
  apiKey: string
  baseUrl?: string
}

function createClient(config: AIConfig): Anthropic {
  const options: any = {
    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
  }
  if (config.baseUrl) {
    options.baseURL = config.baseUrl
  }
  return new Anthropic(options)
}

export class WorkflowGenerator {
  private client: Anthropic
  private modelName: string

  constructor(config?: Partial<AIConfig>) {
    const cfg: AIConfig = {
      provider: config?.provider || 'anthropic',
      modelName: config?.modelName || 'claude-sonnet-4-20250514',
      apiKey: config?.apiKey || process.env.ANTHROPIC_API_KEY || '',
      baseUrl: config?.baseUrl,
    }
    this.client = createClient(cfg)
    this.modelName = cfg.modelName
  }

  async generate(description: string): Promise<WorkflowDefinition> {
    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      system: GENERATE_WORKFLOW_PROMPT,
      messages: [
        { role: 'user', content: description },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 返回了非文本内容')
    }

    let jsonStr = content.text
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
    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 4096,
      system: `你是一个 RPA 流程修改专家。用户会给你一个现有流程和修改要求，请输出修改后的完整流程 JSON。\n\n${GENERATE_WORKFLOW_PROMPT}`,
      messages: [
        {
          role: 'user',
          content: `现有流程:\n\`\`\`json\n${JSON.stringify(existing, null, 2)}\n\`\`\`\n\n修改要求: ${feedback}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 返回了非文本内容')
    }

    let jsonStr = content.text
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
