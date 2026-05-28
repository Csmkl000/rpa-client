import { chromium, type Browser, type Page } from 'playwright-core'
import { Stagehand } from '@browserbasehq/stagehand'
import { launchLocalBrowser } from './launcher'

export interface BrowserManagerOptions {
  port?: number
  browser?: 'chrome' | 'edge' | 'auto'
  userDataDir?: string
  modelName?: string
  apiKey?: string
  provider?: string
  baseUrl?: string
}

export class BrowserManager {
  private browser: Browser | null = null
  private stagehand: Stagehand | null = null
  private options: BrowserManagerOptions
  private port: number

  constructor(options: BrowserManagerOptions = {}) {
    this.options = options
    this.port = options.port || 9222
  }

  async connect(): Promise<Browser> {
    await launchLocalBrowser({
      port: this.port,
      browser: this.options.browser,
      userDataDir: this.options.userDataDir,
    })

    this.browser = await chromium.connectOverCDP(`http://localhost:${this.port}`)
    console.log(`已连接到本地浏览器 (port: ${this.port})`)

    return this.browser
  }

  async createStagehand(page?: Page): Promise<Stagehand> {
    if (!this.browser) {
      await this.connect()
    }

    const isCustom = this.options.provider === 'openai'

    const stagehandOptions: any = {
      env: 'LOCAL',
      modelName: (this.options.modelName as any) || 'claude-sonnet-4-20250514',
      modelClientOptions: {
        apiKey: this.options.apiKey || process.env.ANTHROPIC_API_KEY,
      },
    }

    // OpenAI 兼容模式：设置 baseURL 让 Stagehand 的 OpenAI 客户端指向自定义端点
    if (isCustom && this.options.baseUrl) {
      stagehandOptions.modelClientOptions.baseURL = this.options.baseUrl
    }

    // 传入已有的 page，让 Stagehand 复用而不是自己启动浏览器
    if (page) {
      stagehandOptions.page = page
    }

    this.stagehand = new Stagehand(stagehandOptions)

    console.log('正在初始化 Stagehand...')
    try {
      // 加 60 秒超时防止卡死
      await Promise.race([
        this.stagehand.init(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Stagehand 初始化超时 (60s)')), 60000)
        ),
      ])
      console.log('Stagehand 初始化完成')
    } catch (err) {
      console.error('Stagehand 初始化失败:', err)
      throw err
    }

    return this.stagehand
  }

  async getPages(): Promise<Page[]> {
    if (!this.browser) {
      await this.connect()
    }
    const contexts = this.browser!.contexts()
    const pages: Page[] = []
    for (const ctx of contexts) {
      pages.push(...ctx.pages())
    }
    return pages
  }

  async newPage(): Promise<Page> {
    if (!this.browser) {
      await this.connect()
    }
    const context = this.browser!.contexts()[0]
    return context.newPage()
  }

  isConnected(): boolean {
    return this.browser?.isConnected() ?? false
  }

  async disconnect() {
    if (this.stagehand) {
      try {
        await this.stagehand.close()
      } catch {}
      this.stagehand = null
    }
    if (this.browser) {
      this.browser = null
    }
  }
}
