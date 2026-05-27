import { useEffect, useState } from 'react'
import { executionApi } from '../lib/api'

export default function ExecutionLogs() {
  const [executions, setExecutions] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    loadExecutions()
  }, [])

  async function loadExecutions() {
    const list = await executionApi.list()
    setExecutions(list)
  }

  return (
    <div className="flex h-full">
      {/* 执行列表 */}
      <div className="w-96 border-r bg-white overflow-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold">执行日志</h2>
        </div>
        {executions.map((exec) => (
          <div
            key={exec.id}
            onClick={() => setSelected(exec)}
            className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
              selected?.id === exec.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium font-mono">{exec.id.slice(0, 8)}</span>
              <StatusBadge status={exec.status} />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {exec.stepLogs?.length || 0} 步 ·{' '}
              {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '运行中'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(exec.startedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        ))}
        {executions.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">暂无执行记录</div>
        )}
      </div>

      {/* 详情 */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">执行详情</h3>

            {/* 概览 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <InfoCard label="状态" value={selected.status} />
              <InfoCard label="耗时" value={selected.duration ? `${(selected.duration / 1000).toFixed(1)}s` : '-'} />
              <InfoCard label="步骤数" value={selected.stepLogs?.length || 0} />
              <InfoCard label="AI 修复" value={selected.aiPatches?.length || 0} />
            </div>

            {/* 步骤日志 */}
            <h4 className="font-semibold mb-3">步骤执行日志</h4>
            <div className="space-y-2">
              {selected.stepLogs?.map((log: any, i: number) => (
                <div key={i} className="bg-white border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {i + 1}. {log.stepType} <span className="text-gray-400">({log.stepId})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{log.duration}ms</span>
                      <StatusBadge status={log.status} />
                    </div>
                  </div>
                  {log.error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                      {log.error}
                    </div>
                  )}
                  {log.output && (
                    <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                      <pre>{JSON.stringify(log.output, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI 修复记录 */}
            {selected.aiPatches?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">AI 修复记录</h4>
                <div className="space-y-2">
                  {selected.aiPatches.map((patch: any, i: number) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-sm font-medium">步骤: {patch.stepId}</div>
                      <div className="text-xs text-gray-600 mt-1">原因: {patch.reason}</div>
                      <div className="text-xs mt-2">
                        <span className="text-red-500">原始: {patch.original}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">修复: {patch.fixed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            选择一条执行记录查看详情
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white border rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}
