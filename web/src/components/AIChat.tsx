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

  return (
    <form onSubmit={handleSubmit} className="p-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="描述你想要自动化的流程，例如：&#10;打开淘宝，搜索'手机壳'，按价格排序，提取前10个商品的名称和价格"
        className="w-full border rounded-md p-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        className="mt-2 w-full py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '生成中...' : '生成流程'}
      </button>
    </form>
  )
}
