import { useState } from 'react'
import { browserApi } from '../lib/api'
import { useBrowserStore } from '../stores/browser'

export default function Settings() {
  const { connected, info, check } = useBrowserStore()
  const [loading, setLoading] = useState(false)

  async function handleLaunch() {
    setLoading(true)
    try {
      await browserApi.launch()
      await check()
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
      await check()
    } catch (err) {
      alert(`关闭失败: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">设置</h2>
        <p className="text-sm text-gray-500 mt-1">配置浏览器连接和 AI 服务</p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5">浏览器连接</h3>

        <div className="flex items-center justify-between mb-5 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-900">连接状态</div>
            <div className="text-xs text-gray-500 mt-0.5">通过 CDP 协议连接本地 Chrome / Edge</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={`text-sm font-medium ${connected ? 'text-green-700' : 'text-red-700'}`}>
              {connected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>

        {connected && info && (
          <div className="flex gap-6 mb-5 text-sm">
            <div><span className="text-gray-500">调试端口:</span> <span className="font-mono font-medium">{info.port}</span></div>
            {info.browser && <div><span className="text-gray-500">浏览器:</span> <span className="font-mono font-medium">{info.browser}</span></div>}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleLaunch}
            disabled={loading}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '处理中...' : '启动浏览器'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            关闭浏览器
          </button>
          <button
            onClick={check}
            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            刷新
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">手动连接浏览器</h3>
        <p className="text-sm text-gray-600 mb-4">如果自动启动失败，手动启动 Chrome 并开启远程调试：</p>
        <div className="space-y-3">
          {[
            { os: 'Windows', cmd: 'chrome.exe --remote-debugging-port=9222' },
            { os: 'macOS', cmd: '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222' },
            { os: 'Linux', cmd: 'google-chrome --remote-debugging-port=9222' },
          ].map((item) => (
            <div key={item.os}>
              <div className="text-xs font-medium text-gray-500 mb-1">{item.os}</div>
              <code className="block bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-700">
                {item.cmd}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">AI 配置</h3>
        <div className="text-sm text-gray-600 space-y-3">
          <p>需要设置环境变量 <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">ANTHROPIC_API_KEY</code></p>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Windows PowerShell</div>
            <code className="block bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-700">
              $env:ANTHROPIC_API_KEY = "sk-ant-..."
            </code>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">macOS / Linux</div>
            <code className="block bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-700">
              export ANTHROPIC_API_KEY=sk-ant-...
            </code>
          </div>
        </div>
      </section>
    </div>
  )
}
