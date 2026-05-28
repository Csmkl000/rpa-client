import type { FastifyInstance } from 'fastify'
import { launchLocalBrowser, closeLocalBrowser } from '../../engine/launcher'
import { db } from '../../db/index'
import { configs } from '../../db/schema'
import { eq } from 'drizzle-orm'

const BROWSER_PORT = parseInt(process.env.RPA_BROWSER_PORT || '9222')

// 默认配置
const DEFAULT_CONFIG: Record<string, string> = {
  model_provider: 'anthropic',
  model_name: 'claude-sonnet-4-20250514',
  model_api_key: '',
  model_base_url: '',
}

async function getConfig(key: string): Promise<string> {
  const [row] = await db.select().from(configs).where(eq(configs.key, key))
  return row?.value ?? (DEFAULT_CONFIG[key] || '')
}

async function setConfig(key: string, value: string) {
  const now = new Date()
  const existing = await db.select().from(configs).where(eq(configs.key, key))
  if (existing.length > 0) {
    await db.update(configs).set({ value, updatedAt: now }).where(eq(configs.key, key))
  } else {
    await db.insert(configs).values({ key, value, updatedAt: now })
  }
}

export async function settingsRoutes(app: FastifyInstance) {
  // 浏览器状态
  app.get('/api/browser/status', async () => {
    try {
      const res = await fetch(`http://localhost:${BROWSER_PORT}/json/version`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json() as any
        return {
          connected: true,
          browser: data.Browser || 'unknown',
          port: BROWSER_PORT,
        }
      }
      return { connected: false, port: BROWSER_PORT }
    } catch {
      return { connected: false, port: BROWSER_PORT }
    }
  })

  // 启动浏览器
  app.post('/api/browser/launch', async () => {
    try {
      const result = await launchLocalBrowser({ port: BROWSER_PORT })
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // 关闭浏览器
  app.post('/api/browser/close', async () => {
    try {
      await closeLocalBrowser(BROWSER_PORT)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // 获取所有配置
  app.get('/api/config', async () => {
    const result: Record<string, string> = {}
    for (const key of Object.keys(DEFAULT_CONFIG)) {
      result[key] = await getConfig(key)
    }
    return result
  })

  // 更新配置
  app.post<{ Body: Record<string, string> }>('/api/config', async (request) => {
    const body = request.body
    for (const [key, value] of Object.entries(body)) {
      if (key in DEFAULT_CONFIG) {
        await setConfig(key, value)
      }
    }
    // 返回最新配置
    const result: Record<string, string> = {}
    for (const key of Object.keys(DEFAULT_CONFIG)) {
      result[key] = await getConfig(key)
    }
    return result
  })
}

// 批量获取配置（单次查询）
export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.select().from(configs)
  const map = new Map(rows.map(r => [r.key, r.value]))
  const result: Record<string, string> = {}
  for (const key of keys) {
    result[key] = map.get(key) ?? (DEFAULT_CONFIG[key] || '')
  }
  return result
}

// 导出 getConfig 供其他模块使用
export { getConfig }
