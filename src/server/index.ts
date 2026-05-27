import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { createServer } from 'http'
import { join } from 'path'
import { existsSync } from 'fs'
import { workflowRoutes } from './routes/workflow'
import { executionRoutes } from './routes/execution'
import { settingsRoutes } from './routes/settings'
import { WsManager } from './ws'

export interface ServerOptions {
  port?: number
  host?: string
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(500) })
      if (!res.ok) return port
    } catch {
      return port
    }
  }
  throw new Error('找不到可用端口')
}

export async function startServer(options: ServerOptions = {}) {
  const preferredPort = options.port || 3456
  const host = options.host || 'localhost'
  const port = await findAvailablePort(preferredPort)

  const app = Fastify({
    logger: true,
  })

  // CORS
  await app.register(cors, { origin: true })

  // 静态文件（前端构建产物）
  const webDist = join(import.meta.dir, '../../web/dist')
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/',
    })
  }

  // HTTP 服务器（用于 WebSocket）
  const server = app.server
  const ws = new WsManager(server)

  // 注册路由
  await app.register((app) => workflowRoutes(app))
  await app.register((app) => executionRoutes(app, ws))
  await app.register((app) => settingsRoutes(app))

  // 健康检查
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: Date.now(),
    wsClients: ws.clientCount,
  }))

  // 启动
  await app.listen({ port, host })

  console.log('')
  console.log(`  RPA Client 已启动`)
  console.log(`  管理界面: http://${host}:${port}`)
  console.log(`  API:      http://${host}:${port}/api`)
  console.log(`  WebSocket: ws://${host}:${port}/ws`)
  console.log('')

  return { app, server, ws }
}

// 直接运行
if (import.meta.main) {
  startServer({ port: parseInt(process.env.RPA_PORT || '3456') })
}
