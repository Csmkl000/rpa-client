import { useEffect, useState } from 'react'
import { workflowApi, executionApi } from '../lib/api'
import AIChat from '../components/AIChat'
import FlowCanvas from '../components/FlowCanvas'

export default function WorkflowEditor() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [showAI, setShowAI] = useState(false)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    loadWorkflows()
  }, [])

  async function loadWorkflows() {
    const list = await workflowApi.list()
    setWorkflows(list)
  }

  async function handleGenerate(description: string) {
    setLoading(true)
    try {
      const workflow = await workflowApi.generate(description)
      setWorkflows([workflow, ...workflows])
      setSelected(workflow)
      setShowAI(false)
    } catch (err) {
      alert(`生成失败: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleRun(workflowId: string) {
    setRunning(true)
    try {
      const result = await executionApi.run(workflowId)
      alert(`执行已启动: ${result.executionId}`)
    } catch (err) {
      alert(`执行失败: ${(err as Error).message}`)
    } finally {
      setRunning(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此流程？')) return
    await workflowApi.delete(id)
    if (selected?.id === id) setSelected(null)
    loadWorkflows()
  }

  return (
    <div className="flex h-full">
      {/* 左侧：流程列表 */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">流程列表</h2>
            <button
              onClick={() => setShowAI(!showAI)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showAI
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <span>✨</span> AI 生成
            </button>
          </div>
          <div className="text-xs text-gray-400">{workflows.length} 个流程</div>
        </div>

        {/* AI 对话 */}
        {showAI && (
          <div className="border-b border-gray-100 bg-gray-50">
            <AIChat onGenerate={handleGenerate} loading={loading} />
          </div>
        )}

        {/* 流程列表 */}
        <div className="flex-1 overflow-auto">
          {workflows.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-3xl mb-2">⚡</div>
              <p className="text-sm text-gray-400">暂无流程</p>
              <p className="text-xs text-gray-300 mt-1">点击「AI 生成」创建</p>
            </div>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => setSelected(wf)}
                className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-all ${
                  selected?.id === wf.id
                    ? 'bg-blue-50 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="font-medium text-sm text-gray-900 truncate">{wf.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{wf.steps?.length || 0} 步</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">v{wf.version || 1}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧：详情 */}
      <div className="flex-1 flex flex-col bg-[#f8f9fb]">
        {selected ? (
          <>
            {/* 工具栏 */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                {selected.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{selected.description}</p>
                )}
              </div>
              <button
                onClick={() => handleRun(selected.id)}
                disabled={running}
                className="inline-flex items-center gap-2 px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {running ? '⏳ 执行中...' : '▶ 运行'}
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
              >
                🗑 删除
              </button>
            </div>

            {/* 流程画布 */}
            <div className="flex-1 p-6">
              <div className="bg-white rounded-xl border border-gray-200 h-full shadow-sm overflow-hidden">
                <FlowCanvas steps={selected.steps || []} />
              </div>
            </div>

            {/* 步骤 JSON */}
            <div className="bg-white border-t border-gray-200 px-6 py-4 max-h-56 overflow-auto">
              <details>
                <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                  查看流程定义 JSON
                </summary>
                <pre className="mt-3 text-xs bg-gray-50 p-4 rounded-lg overflow-auto font-mono text-gray-700 border border-gray-100">
                  {JSON.stringify(selected.steps, null, 2)}
                </pre>
              </details>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">选择或创建流程</h3>
              <p className="text-sm text-gray-400">从左侧选择一个流程，或用 AI 生成新流程</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
