#!/usr/bin/env bun
import { program } from 'commander'
import { startServer } from './server/index'
import { launchLocalBrowser, closeLocalBrowser } from './engine/launcher'
import { WorkflowGenerator } from './ai/generator'
import { db } from './db/index'
import { workflows } from './db/schema'

program
  .name('rpa-client')
  .description('AI-driven RPA platform powered by Stagehand')
  .version('0.1.0')

// 启动服务
program
  .command('start')
  .description('启动 RPA 平台')
  .option('-p, --port <port>', '服务端口', '3456')
  .option('-h, --host <host>', '监听地址', 'localhost')
  .action(async (options) => {
    await startServer({
      port: parseInt(options.port),
      host: options.host,
    })
  })

// 浏览器管理
const browserCmd = program.command('browser').description('浏览器管理')

browserCmd
  .command('launch')
  .description('启动本地浏览器')
  .option('-p, --port <port>', '调试端口', '9222')
  .action(async (options) => {
    const result = await launchLocalBrowser({ port: parseInt(options.port) })
    console.log(result)
  })

browserCmd
  .command('close')
  .description('关闭本地浏览器')
  .option('-p, --port <port>', '调试端口', '9222')
  .action(async (options) => {
    await closeLocalBrowser(parseInt(options.port))
    console.log('浏览器已关闭')
  })

// AI 生成流程
program
  .command('generate')
  .description('用 AI 生成 RPA 流程')
  .argument('<description>', '流程描述')
  .option('-o, --output <file>', '输出文件')
  .action(async (description, options) => {
    const generator = new WorkflowGenerator()
    console.log('正在生成流程...')
    const workflow = await generator.generate(description)

    if (options.output) {
      const { writeFileSync } = await import('fs')
      writeFileSync(options.output, JSON.stringify(workflow, null, 2))
      console.log(`流程已保存到: ${options.output}`)
    } else {
      console.log(JSON.stringify(workflow, null, 2))
    }
  })

// 列出流程
program
  .command('list')
  .description('列出所有流程')
  .action(async () => {
    const all = await db.select().from(workflows)
    if (all.length === 0) {
      console.log('暂无流程')
      return
    }
    for (const wf of all) {
      const steps = JSON.parse(wf.steps)
      console.log(`  ${wf.id}  ${wf.name}  (${steps.length} 步)  v${wf.version}`)
    }
  })

program.parse()
