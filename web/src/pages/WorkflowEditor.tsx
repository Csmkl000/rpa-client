import { useEffect, useState, useCallback } from 'react'
import { workflowApi, executionApi } from '../lib/api'
import AIChat from '../components/AIChat'
import FlowCanvas from '../components/FlowCanvas'

export default function WorkflowEditor() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [showAI, setShowAI] = useState(false)
  const [loading, setLoading] = useState(false)

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
    try {
      const result = await executionApi.run(workflowId)
      alert(`执行已启动: ${result.executionId}`)
    } catch (err) {
      alert(`执行失败: ${(err as Error).message}`)
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
      {/* 流程列表 */}
      <div className="w-72 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">流程列表</h2>
          <button
            onClick={() => setShowAI(!showAI)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            AI 生成
          </button>
        </div>

        {/* AI 对话框 */}
        {showAI && (
          <div className="border-b">
            <AIChat onGenerate={handleGenerate} loading={loading} />
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => setSelected(wf)}
              className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                selected?.id === wf.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}
            >
              <div className="font-medium text-sm">{wf.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {wf.steps?.length || 0} 步 · v{wf.version || 1}
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-sm">
              暂无流程，点击「AI 生成」创建
            </div>
          )}
        </div>
      </div>

      {/* 详情/编辑区 */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* 工具栏 */}
            <div className="p-4 border-b bg-white flex items-center gap-3">
              <h3 className="font-semibold flex-1">{selected.name}</h3>
              <button
                onClick={() => handleRun(selected.id)}
                className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                运行
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="px-4 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                删除
              </button>
            </div>

            {/* 流程画布 */}
            <div className="flex-1">
              <FlowCanvas steps={selected.steps || []} />
            </div>

            {/* 步骤详情 */}
            <div className="border-t bg-white p-4 max-h-64 overflow-auto">
              <h4 className="text-sm font-medium mb-2">步骤详情</h4>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                {JSON.stringify(selected.steps, null, 2)}
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            选择一个流程或用 AI 生成新流程
          </div>
        )}
      </div>
    </div>
  )
}
