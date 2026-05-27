import { chromium, type Browser, type Page } from 'playwright-core'
import { Stagehand } from '@browserbasehq/stagehand'
import { launchLocalBrowser } from './launcher'

export interface BrowserManagerOptions {
  port?: number
  browser?: 'chrome' | 'edge' | 'auto'
  userDataDir?: string
  modelName?: string
  apiKey?: string
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

    this.stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: (this.options.modelName as any) || 'claude-sonnet-4-20250514',
      modelClientOptions: {
        apiKey: this.options.apiKey || process.env.ANTHROPIC_API_KEY,
      },
    })

    await this.stagehand.init()

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
      await this.stagehand.close()
      this.stagehand = null
    }
    if (this.browser) {
      this.browser = null
    }
  }
}
