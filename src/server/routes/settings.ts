import type { FastifyInstance } from 'fastify'
import { launchLocalBrowser, closeLocalBrowser } from '../../engine/launcher'
import { BrowserManager } from '../../engine/browser'

export async function settingsRoutes(app: FastifyInstance) {
  // 浏览器状态
  app.get('/api/browser/status', async () => {
    const manager = new BrowserManager()
    try {
      await manager.connect()
      const pages = await manager.getPages()
      const connected = manager.isConnected()
      await manager.disconnect()
      return {
        connected,
        pageCount: pages.length,
        port: parseInt(process.env.RPA_BROWSER_PORT || '9222'),
      }
    } catch {
      return { connected: false, pageCount: 0, port: 9222 }
    }
  })

  // 启动浏览器
  app.post('/api/browser/launch', async () => {
    try {
      const result = await launchLocalBrowser({
        port: parseInt(process.env.RPA_BROWSER_PORT || '9222'),
      })
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // 关闭浏览器
  app.post('/api/browser/close', async () => {
    try {
      await closeLocalBrowser(parseInt(process.env.RPA_BROWSER_PORT || '9222'))
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
