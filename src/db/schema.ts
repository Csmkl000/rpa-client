import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// 流程定义
export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  version: integer('version').notNull().default(1),
  // 流程步骤 JSON
  steps: text('steps').notNull(), // JSON string
  // 输入参数定义
  inputs: text('inputs').notNull().default('{}'), // JSON string
  // 错误策略
  errorPolicy: text('error_policy').notNull().default('{}'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// 执行记录
export const executions = sqliteTable('executions', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  status: text('status').notNull(), // 'running' | 'success' | 'failed' | 'partial'
  inputs: text('inputs').notNull().default('{}'), // JSON string
  // 每步执行日志
  stepLogs: text('step_logs').notNull().default('[]'), // JSON string
  // AI 修复记录
  aiPatches: text('ai_patches').notNull().default('[]'), // JSON string
  error: text('error'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp' }),
  duration: integer('duration'), // ms
})

// AI 修复历史（用于流程自优化）
export const patches = sqliteTable('patches', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  stepId: text('step_id').notNull(),
  originalStep: text('original_step').notNull(), // JSON string
  fixedStep: text('fixed_step').notNull(), // JSON string
  error: text('error').notNull(),
  screenshot: text('screenshot'), // base64 or file path
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// 定时任务
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  cron: text('cron').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  inputs: text('inputs').notNull().default('{}'), // JSON string
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// 凭证管理（加密存储）
export const credentials = sqliteTable('credentials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'basic' | 'cookie' | 'token'
  data: text('data').notNull(), // encrypted JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// 系统配置（KV 存储）
export const configs = sqliteTable('configs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
