import type { FastifyInstance } from 'fastify'
import { db } from '../../db/index'
import { workflows, executions } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { WorkflowExecutor } from '../../engine/executor'
import { TaskQueue } from '../../scheduler/queue'
import type { WsManager } from '../ws'
import { getConfig } from './settings'

export async function executionRoutes(app: FastifyInstance, ws: WsManager) {
  const queue = new TaskQueue(2)

  // 获取执行记录列表
  app.get<{ Querystring: { workflowId?: string; limit?: string } }>(
    '/api/executions',
    async (request) => {
      const { workflowId, limit } = request.query
      let query = db.select().from(executions).orderBy(desc(executions.startedAt))

      if (workflowId) {
        query = query.where(eq(executions.workflowId, workflowId)) as any
      }

      const results = await query.limit(parseInt(limit || '50'))

      return results.map(e => ({
        ...e,
        stepLogs: JSON.parse(e.stepLogs),
        aiPatches: JSON.parse(e.aiPatches),
        inputs: JSON.parse(e.inputs),
      }))
    }
  )

  // 获取单条执行记录
  app.get<{ Params: { id: string } }>('/api/executions/:id', async (request, reply) => {
    const { id } = request.params
    const [exec] = await db.select().from(executions).where(eq(executions.id, id))
    if (!exec) return reply.status(404).send({ error: '执行记录不存在' })

    return {
      ...exec,
      stepLogs: JSON.parse(exec.stepLogs),
      aiPatches: JSON.parse(exec.aiPatches),
      inputs: JSON.parse(exec.inputs),
    }
  })

  // 执行流程
  app.post<{ Body: { workflowId: string; inputs?: Record<string, any> } }>(
    '/api/executions',
    async (request, reply) => {
      const { workflowId, inputs = {} } = request.body

      // 查询流程定义
      const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId))
      if (!wf) return reply.status(404).send({ error: '流程不存在' })

      const executionId = randomUUID()
      const now = new Date()

      // 创建执行记录
      await db.insert(executions).values({
        id: executionId,
        workflowId,
        status: 'running',
        inputs: JSON.stringify(inputs),
        stepLogs: '[]',
        aiPatches: '[]',
        startedAt: now,
      })

      // 广播执行开始
      ws.broadcast('execution:start', { executionId, workflowId })

      // 加入队列异步执行
      queue.add(async () => {
        // 读取 AI 配置
        const [provider, modelName, apiKey, baseUrl] = await Promise.all([
          getConfig('model_provider'),
          getConfig('model_name'),
          getConfig('model_api_key'),
          getConfig('model_base_url'),
        ])

        const executor = new WorkflowExecutor({}, {
          provider,
          modelName,
          apiKey,
          baseUrl: baseUrl || undefined,
        })

        // 监听执行事件，实时推送
        executor.onEvent(({ type, stepId, data }) => {
          ws.broadcast(type, { executionId, stepId, ...data })
        })

        const workflow = {
          id: wf.id,
          name: wf.name,
          steps: JSON.parse(wf.steps),
          inputs: JSON.parse(wf.inputs),
          errorPolicy: JSON.parse(wf.errorPolicy),
        }

        const result = await executor.execute(workflow, inputs)

        // 更新执行记录
        await db.update(executions).set({
          status: result.status,
          stepLogs: JSON.stringify(result.stepLogs),
          aiPatches: JSON.stringify(result.aiPatches),
          finishedAt: new Date(),
          duration: result.duration,
        }).where(eq(executions.id, executionId))

        // 广播执行完成
        ws.broadcast('execution:done', {
          executionId,
          status: result.status,
          duration: result.duration,
        })
      }).catch(async (err) => {
        console.error('执行队列错误:', err)
        // 更新执行状态为失败
        await db.update(executions).set({
          status: 'failed',
          stepLogs: JSON.stringify([{ stepId: 'init', stepType: 'init', status: 'failed', startedAt: Date.now(), finishedAt: Date.now(), duration: 0, error: err.message || String(err) }]),
          finishedAt: new Date(),
          duration: 0,
        }).where(eq(executions.id, executionId))
        ws.broadcast('execution:done', { executionId, status: 'failed', duration: 0 })
      })

      return { executionId, status: 'queued' }
    }
  )
}
