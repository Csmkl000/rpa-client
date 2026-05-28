import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { AIConfig } from './generator'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; [key: string]: any }>
}

export interface ChatResponse {
  text: string
}

// 客户端缓存，避免每次调用都创建新实例
const anthropicCache = new Map<string, Anthropic>()
const openaiCache = new Map<string, OpenAI>()

function cacheKey(config: AIConfig): string {
  return `${config.apiKey}|${config.baseUrl || ''}|${config.modelName}`
}

export function createAnthropicClient(config: AIConfig): Anthropic {
  const key = cacheKey(config)
  if (anthropicCache.has(key)) return anthropicCache.get(key)!

  const options: any = {
    apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
  }
  if (config.baseUrl) {
    options.baseURL = config.baseUrl
  }
  const client = new Anthropic(options)
  anthropicCache.set(key, client)
  return client
}

export function createOpenAIClient(config: AIConfig): OpenAI {
  const key = cacheKey(config)
  if (openaiCache.has(key)) return openaiCache.get(key)!

  const client = new OpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    baseURL: config.baseUrl || 'https://api.openai.com/v1',
  })
  openaiCache.set(key, client)
  return client
}

/**
 * Convert Anthropic content blocks to OpenAI message content format
 */
function toOpenAIContent(
  content: string | Array<{ type: string; [key: string]: any }>
): string | Array<any> {
  if (typeof content === 'string') return content
  return content.map(block => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text }
    }
    if (block.type === 'image') {
      return {
        type: 'image_url',
        image_url: {
          url: `data:${block.source.media_type};base64,${block.source.data}`,
        },
      }
    }
    return block
  })
}

/**
 * Unified chat completion that works with both Anthropic and OpenAI-compatible APIs
 */
export async function chatCompletion(
  config: AIConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 4096,
): Promise<ChatResponse> {
  if (config.provider === 'openai') {
    const client = createOpenAIClient(config)

    const oaiMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: toOpenAIContent(m.content),
      })),
    ]

    const response = await client.chat.completions.create({
      model: config.modelName,
      max_tokens: maxTokens,
      messages: oaiMessages,
    })

    return { text: response.choices[0]?.message?.content || '' }
  } else {
    // Anthropic
    const client = createAnthropicClient(config)

    const anthropicMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as any,
    }))

    const response = await client.messages.create({
      model: config.modelName,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 返回了非文本内容')
    }

    return { text: content.text }
  }
}
