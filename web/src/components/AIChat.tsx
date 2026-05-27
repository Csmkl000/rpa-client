import { useState } from 'react'

interface Props {
  onGenerate: (description: string) => Promise<void>
  loading: boolean
}

export default function AIChat({ onGenerate, loading }: Props) {
  const [input, setInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    await onGenerate(input.trim())
    setInput('')
  }

  const examples = [
    '打开百度，搜索今天的天气',
    '登录 ERP 系统，导出本月销售报表',
    '在淘宝搜索"手机壳"，按价格排序，提取前10个商品',
  ]

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="描述你想要自动化的流程..."
          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="mt-2 w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 生成中...
            </>
          ) : (
            <>
              <span>✨</span> 生成流程
            </>
          )}
        </button>
      </form>

      {/* 示例提示 */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">示例</div>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setInput(ex)}
            className="block w-full text-left text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors truncate"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}
