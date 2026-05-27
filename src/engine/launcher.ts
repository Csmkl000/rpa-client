import { spawn, execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const DEFAULT_PORT = 9222

interface LaunchOptions {
  port?: number
  userDataDir?: string | 'default'
  browser?: 'chrome' | 'edge' | 'auto'
}

interface LaunchResult {
  port: number
  reused: boolean
  pid?: number
  needsManualRestart?: boolean
  message?: string
}

const browserPaths: Record<string, Record<string, string[]>> = {
  win32: {
    chrome: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
    edge: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
  },
  darwin: {
    chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    edge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
  },
  linux: {
    chrome: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ],
    edge: [
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
    ],
  },
}

const defaultUserDataDirs: Record<string, string> = {
  win32: join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data'),
  darwin: join(process.env.HOME || '', 'Library', 'Application Support', 'Google', 'Chrome'),
  linux: join(process.env.HOME || '', '.config', 'google-chrome'),
}

function findBrowserPath(browser: 'chrome' | 'edge' | 'auto'): string {
  const platform = process.platform
  const platformPaths = browserPaths[platform]
  if (!platformPaths) {
    throw new Error(`不支持的平台: ${platform}`)
  }

  const searchOrder = browser === 'auto' ? ['chrome', 'edge'] : [browser]

  for (const name of searchOrder) {
    const paths = platformPaths[name] || []
    for (const p of paths) {
      if (existsSync(p)) return p
    }
  }

  throw new Error('未找到浏览器。请安装 Chrome 或 Edge。')
}

async function isDebugPortOpen(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/json/version`, {
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}

function isChromeRunning(): boolean {
  try {
    if (process.platform === 'win32') {
      const output = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', {
        encoding: 'utf-8',
        timeout: 5000,
      })
      return output.includes('chrome.exe')
    } else if (process.platform === 'darwin') {
      const output = execSync('pgrep -x "Google Chrome"', { encoding: 'utf-8', timeout: 5000 })
      return output.trim().length > 0
    } else {
      const output = execSync('pgrep -x chrome || pgrep -x google-chrome || true', { encoding: 'utf-8', timeout: 5000 })
      return output.trim().length > 0
    }
  } catch {
    return false
  }
}

async function waitForReady(port: number, timeout = 15000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await isDebugPortOpen(port)) return
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`浏览器启动超时 (${timeout}ms)`)
}

export async function launchLocalBrowser(options: LaunchOptions = {}): Promise<LaunchResult> {
  const port = options.port || DEFAULT_PORT
  const browserType = options.browser || 'auto'

  // 已经有调试端口在监听，直接复用
  if (await isDebugPortOpen(port)) {
    console.log(`浏览器已在 localhost:${port} 运行（调试模式），直接复用`)
    return { port, reused: true }
  }

  // Chrome 在运行但没有调试端口 → 无法自动开启
  if (isChromeRunning()) {
    return {
      port,
      reused: false,
      needsManualRestart: true,
      message: 'Chrome 已在运行但未开启调试端口。请关闭所有 Chrome 窗口后，用以下命令重新启动：\nchrome.exe --remote-debugging-port=9222',
    }
  }

  // Chrome 没有运行 → 直接启动
  const browserPath = findBrowserPath(browserType)

  let userDataDir: string
  if (options.userDataDir === 'default' || options.userDataDir === undefined) {
    userDataDir = defaultUserDataDirs[process.platform] || join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.rpa',
      'browser-profile'
    )
  } else {
    userDataDir = options.userDataDir
  }

  console.log(`启动浏览器: ${browserPath}`)
  console.log(`调试端口: ${port}`)

  const child = spawn(browserPath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  await waitForReady(port)
  console.log('浏览器已就绪（调试模式）')

  return { port, reused: false, pid: child.pid }
}

export async function closeLocalBrowser(port: number = DEFAULT_PORT) {
  try {
    const res = await fetch(`http://localhost:${port}/json/version`)
    const data = await res.json() as any
    const ws = data.webSocketDebuggerUrl
    if (ws) {
      const { WebSocket } = await import('ws')
      const socket = new WebSocket(ws)
      await new Promise<void>((resolve) => {
        socket.on('open', () => {
          socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }))
          setTimeout(() => {
            socket.close()
            resolve()
          }, 1000)
        })
        socket.on('error', () => resolve())
      })
    }
  } catch {
    // 浏览器可能已经关闭
  }
}
