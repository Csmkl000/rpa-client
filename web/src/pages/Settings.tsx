import { useState, useEffect } from 'react'
import { browserApi } from '../lib/api'
import { useBrowserStore } from '../stores/browser'

const BASE_URL = '/api'

async function fetchConfig(): Promise<Record<string, string>> {
  const res = await fetch(`${BASE_URL}/config`)
  return res.json()
}

async function saveConfig(data: Record<string, string>): Promise<Record<string, string>> {
  const res = await fetch(`${BASE_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export default function Settings() {
  const { connected, info, check } = useBrowserStore()
  const [loading, setLoading] = useState(false)
  const [launchMsg, setLaunchMsg] = useState<string | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [configLoading, setConfigLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchConfig().then(c => { setConfig(c); setConfigLoading(false) })
  }, [])

  async function handleSaveConfig() {
    setConfigLoading(true)
    try {
      const updated = await saveConfig(config)
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setConfigLoading(false)
    }
  }

  async function handleLaunch() {
    setLoading(true)
    setLaunchMsg(null)
    try {
      const result = await browserApi.launch()
      if (result.needsManualRestart) {
        setLaunchMsg(result.message)
      } else {
        await check()
      }
    } catch (err) {
      setLaunchMsg(`启动失败: ${(err as Error).message}`)
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
        <p className="text-sm text-gray-500 mt-1">配置浏览器连接和 AI 模型</p>
      </div>

      {/* 浏览器 */}
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
          <button onClick={handleLaunch} disabled={loading}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {loading ? '处理中...' : '启动浏览器'}
          </button>
          <button onClick={handleClose} disabled={loading}
            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
            关闭浏览器
          </button>
          <button onClick={check}
            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            刷新
          </button>
        </div>

        {launchMsg && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <div>
                <div className="text-sm font-medium text-amber-800 mb-2">需要手动启动浏览器</div>
                <p className="text-sm text-amber-700 mb-3">{launchMsg}</p>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-amber-600">操作步骤：</div>
                  <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside">
                    <li>关闭所有 Chrome 窗口</li>
                    <li>按 Win+R，输入以下命令并回车：</li>
                  </ol>
                  <code className="block bg-amber-100 border border-amber-200 rounded px-3 py-2 text-xs font-mono text-amber-900 mt-2">
                    chrome.exe --remote-debugging-port=9222
                  </code>
                  <p className="text-xs text-amber-600 mt-2">启动后回到此页面点击「刷新」</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* AI 模型配置 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-5">AI 模型配置</h3>

        <div className="space-y-5">
          {/* 模型提供商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型提供商</label>
            <select
              value={config.model_provider || 'anthropic'}
              onChange={e => setConfig({ ...config, model_provider: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI 兼容</option>
            </select>
          </div>

          {/* 模型名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
            {config.model_provider === 'openai' ? (
              <input
                type="text"
                value={config.model_name || ''}
                onChange={e => setConfig({ ...config, model_name: e.target.value })}
                placeholder="gpt-4o / deepseek-chat / qwen-plus"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <select
                value={config.model_name || 'claude-sonnet-4-20250514'}
                onChange={e => setConfig({ ...config, model_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="claude-opus-4-20250514">Claude Opus 4</option>
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {config.model_provider === 'openai'
                ? '支持所有 OpenAI 兼容 API（OpenAI、DeepSeek、通义千问、Ollama 等）'
                : 'Anthropic 官方模型'}
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
            <input
              type="password"
              value={config.model_api_key || ''}
              onChange={e => setConfig({ ...config, model_api_key: e.target.value })}
              placeholder="sk-..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">留空则使用环境变量 ANTHROPIC_API_KEY</p>
          </div>

          {/* Base URL（OpenAI 兼容模式） */}
          {config.model_provider === 'openai' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">API Base URL</label>
              <input
                type="text"
                value={config.model_base_url || ''}
                onChange={e => setConfig({ ...config, model_base_url: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                DeepSeek: https://api.deepseek.com/v1 | 通义千问: https://dashscope.aliyuncs.com/compatible-mode/v1
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSaveConfig}
            disabled={configLoading}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {configLoading ? '保存中...' : '保存配置'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">已保存</span>
          )}
        </div>
      </section>

      {/* 手动连接 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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
    </div>
  )
}
