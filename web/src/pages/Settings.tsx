import { useEffect, useState } from 'react'
import { browserApi } from '../lib/api'

export default function Settings() {
  const [browserStatus, setBrowserStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkBrowser()
  }, [])

  async function checkBrowser() {
    try {
      const status = await browserApi.status()
      setBrowserStatus(status)
    } catch {
      setBrowserStatus({ connected: false })
    }
  }

  async function handleLaunch() {
    setLoading(true)
    try {
      await browserApi.launch()
      await checkBrowser()
    } catch (err) {
      alert(`启动失败: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    setLoading(true)
    try {
      await browserApi.close()
      await checkBrowser()
    } catch (err) {
      alert(`关闭失败: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">设置</h2>

      {/* 浏览器设置 */}
      <section className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">浏览器</h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium">连接状态</div>
            <div className="text-xs text-gray-500 mt-1">
              通过 CDP 协议连接本地 Chrome/Edge
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              browserStatus?.connected
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {browserStatus?.connected ? '已连接' : '未连接'}
          </span>
        </div>

        {browserStatus?.connected && (
          <div className="text-sm text-gray-600 mb-4">
            调试端口: {browserStatus.port} · 标签页: {browserStatus.pageCount}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleLaunch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '处理中...' : '启动浏览器'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            关闭浏览器
          </button>
          <button
            onClick={checkBrowser}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
          >
            刷新状态
          </button>
        </div>
      </section>

      {/* 手动连接说明 */}
      <section className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">手动连接浏览器</h3>
        <p className="text-sm text-gray-600 mb-3">
          如果自动启动失败，可以手动启动 Chrome 并开启远程调试：
        </p>
        <div className="bg-gray-50 rounded p-3 font-mono text-sm">
          <div className="text-gray-500 mb-1"># Windows</div>
          <div>chrome.exe --remote-debugging-port=9222</div>
          <div className="text-gray-500 mt-3 mb-1"># macOS</div>
          <div>/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222</div>
          <div className="text-gray-500 mt-3 mb-1"># Linux</div>
          <div>google-chrome --remote-debugging-port=9222</div>
        </div>
      </section>

      {/* AI 配置 */}
      <section className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">AI 配置</h3>
        <div className="text-sm text-gray-600">
          <p>需要设置环境变量 <code className="bg-gray-100 px-1 rounded">ANTHROPIC_API_KEY</code></p>
          <p className="mt-2">在启动前设置：</p>
          <div className="bg-gray-50 rounded p-3 font-mono text-sm mt-2">
            export ANTHROPIC_API_KEY=sk-ant-...
          </div>
        </div>
      </section>
    </div>
  )
}
