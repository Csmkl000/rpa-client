import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
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

export async function startServer(options: ServerOptions = {}) {
  const requestedPort = options.port || 3456
  const host = options.host || 'localhost'

  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

  const webDist = join(import.meta.dir, '../../web/dist')
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' })
  }

  const server = app.server
  const ws = new WsManager(server)

  await app.register((app) => workflowRoutes(app))
  await app.register((app) => executionRoutes(app, ws))
  await app.register((app) => settingsRoutes(app))

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: Date.now(),
    wsClients: ws.clientCount,
  }))

  // 端口被占用时自动尝试下一个
  let port = requestedPort
  for (let i = 0; i < 10; i++) {
    try {
      await app.listen({ port, host })
      break
    } catch (err: any) {
      if (err.code === 'EADDRINUSE') {
        console.log(`端口 ${port} 被占用，尝试 ${port + 1}...`)
        port++
      } else {
        throw err
      }
    }
  }

  console.log(`\n  RPA Client 已启动: http://localhost:${port}\n`)

  return { app, server, ws, port }
}

if (import.meta.main) {
  startServer({ port: parseInt(process.env.RPA_PORT || '3456') })
}
