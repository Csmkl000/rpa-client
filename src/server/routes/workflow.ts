import type { FastifyInstance } from 'fastify'
import { db } from '../../db/index'
import { workflows } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { WorkflowGenerator } from '../../ai/generator'

export async function workflowRoutes(app: FastifyInstance) {
  const generator = new WorkflowGenerator()

  // 获取所有流程
  app.get('/api/workflows', async () => {
    const all = await db.select().from(workflows)
    return all.map(w => ({
      ...w,
      steps: JSON.parse(w.steps),
      inputs: JSON.parse(w.inputs),
      errorPolicy: JSON.parse(w.errorPolicy),
    }))
  })

  // 获取单个流程
  app.get<{ Params: { id: string } }>('/api/workflows/:id', async (request, reply) => {
    const { id } = request.params
    const [wf] = await db.select().from(workflows).where(eq(workflows.id, id))
    if (!wf) return reply.status(404).send({ error: '流程不存在' })

    return {
      ...wf,
      steps: JSON.parse(wf.steps),
      inputs: JSON.parse(wf.inputs),
      errorPolicy: JSON.parse(wf.errorPolicy),
    }
  })

  // 创建流程
  app.post<{ Body: { name: string; description?: string; steps?: any[]; inputs?: any; errorPolicy?: any } }>(
    '/api/workflows',
    async (request) => {
      const { name, description, steps = [], inputs = {}, errorPolicy } = request.body
      const id = randomUUID()
      const now = new Date()

      await db.insert(workflows).values({
        id,
        name,
        description: description || null,
        steps: JSON.stringify(steps),
        inputs: JSON.stringify(inputs),
        errorPolicy: JSON.stringify(errorPolicy || {
          retryWithAI: true,
          maxAIRetries: 3,
          fallbackToHuman: false,
        }),
        createdAt: now,
        updatedAt: now,
      })

      return { id, name, steps, inputs }
    }
  )

  // AI 生成流程
  app.post<{ Body: { description: string } }>(
    '/api/workflows/generate',
    async (request) => {
      const { description } = request.body
      const workflow = await generator.generate(description)

      const now = new Date()
      await db.insert(workflows).values({
        id: workflow.id,
        name: workflow.name,
        description: description,
        steps: JSON.stringify(workflow.steps),
        inputs: JSON.stringify(workflow.inputs),
        errorPolicy: JSON.stringify(workflow.errorPolicy),
        createdAt: now,
        updatedAt: now,
      })

      return workflow
    }
  )

  // AI 修改流程
  app.post<{ Params: { id: string }; Body: { feedback: string } }>(
    '/api/workflows/:id/modify',
    async (request, reply) => {
      const { id } = request.params
      const { feedback } = request.body

      const [wf] = await db.select().from(workflows).where(eq(workflows.id, id))
      if (!wf) return reply.status(404).send({ error: '流程不存在' })

      const existing = {
        id: wf.id,
        name: wf.name,
        steps: JSON.parse(wf.steps),
        inputs: JSON.parse(wf.inputs),
        errorPolicy: JSON.parse(wf.errorPolicy),
      }

      const updated = await generator.modify(existing, feedback)

      await db.update(workflows).set({
        steps: JSON.stringify(updated.steps),
        inputs: JSON.stringify(updated.inputs),
        errorPolicy: JSON.stringify(updated.errorPolicy),
        updatedAt: new Date(),
      }).where(eq(workflows.id, id))

      return updated
    }
  )

  // 删除流程
  app.delete<{ Params: { id: string } }>('/api/workflows/:id', async (request, reply) => {
    const { id } = request.params
    await db.delete(workflows).where(eq(workflows.id, id))
    return { success: true }
  })
}
