import type { FastifyInstance } from 'fastify'
import { launchLocalBrowser, closeLocalBrowser } from '../../engine/launcher'

const BROWSER_PORT = parseInt(process.env.RPA_BROWSER_PORT || '9222')

export async function settingsRoutes(app: FastifyInstance) {
  // 浏览器状态 - 轻量检查，不连接 Playwright
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
}
