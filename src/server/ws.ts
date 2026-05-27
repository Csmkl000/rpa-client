import { WebSocketServer, type WebSocket } from 'ws'
import type { Server } from 'http'

export class WsManager {
  private wss: WebSocketServer
  private clients: Set<WebSocket> = new Set()

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' })

    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      console.log(`WebSocket 客户端已连接 (${this.clients.size} 个)`)

      ws.on('close', () => {
        this.clients.delete(ws)
      })

      ws.on('error', (err) => {
        console.error('WebSocket 错误:', err.message)
        this.clients.delete(ws)
      })
    })
  }

  broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() })
    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(message)
      }
    }
  }

  get clientCount() {
    return this.clients.size
  }
}
