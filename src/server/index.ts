import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { join } from 'path'
import { existsSync, writeFileSync } from 'fs'
import { workflowRoutes } from './routes/workflow'
import { executionRoutes } from './routes/execution'
import { settingsRoutes } from './routes/settings'
import { WsManager } from './ws'

export interface ServerOptions {
  port?: number
  host?: string
}

function tryBind(port: number, host = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net')
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

export async function startServer(options: ServerOptions = {}) {
  const preferredPort = options.port || 3456
  const host = options.host || 'localhost'

  // 找到第一个能绑定的端口
  let port = preferredPort
  for (let i = 0; i < 20; i++) {
    if (await tryBind(port, host)) break
    console.log(`端口 ${port} 不可用，尝试 ${port + 1}...`)
    port++
  }

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

  await app.listen({ port, host })

  // 写入实际端口供 vite proxy 读取
  writeFileSync(join(import.meta.dir, '../../.rpa-port'), String(port))

  console.log(`\n  RPA Client 已启动: http://localhost:${port}\n`)

  return { app, server, ws }
}

if (import.meta.main) {
  startServer({ port: parseInt(process.env.RPA_PORT || '3456') })
}
