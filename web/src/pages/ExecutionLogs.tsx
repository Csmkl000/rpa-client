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
      {/* 列表 */}
      <div className="w-[400px] bg-white border-r border-gray-200 overflow-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">执行日志</h2>
          <p className="text-xs text-gray-500 mt-1">共 {executions.length} 条记录</p>
        </div>
        {executions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-gray-400">暂无执行记录</p>
          </div>
        ) : (
          executions.map((exec) => (
            <div
              key={exec.id}
              onClick={() => setSelected(exec)}
              className={`px-6 py-4 border-b border-gray-50 cursor-pointer transition-all ${
                selected?.id === exec.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-medium text-gray-900">{exec.id.slice(0, 8)}</span>
                <StatusBadge status={exec.status} />
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>{exec.stepLogs?.length || 0} 步</span>
                <span>·</span>
                <span>{exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '运行中'}</span>
                <span>·</span>
                <span>{new Date(exec.startedAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 详情 */}
      <div className="flex-1 overflow-auto bg-[#f8f9fb]">
        {selected ? (
          <div className="p-8 max-w-4xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">执行详情</h3>

            {/* 概览卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <InfoCard label="状态"><StatusBadge status={selected.status} /></InfoCard>
              <InfoCard label="耗时">{selected.duration ? `${(selected.duration / 1000).toFixed(1)}s` : '-'}</InfoCard>
              <InfoCard label="步骤数">{selected.stepLogs?.length || 0}</InfoCard>
              <InfoCard label="AI 修复">{selected.aiPatches?.length || 0}</InfoCard>
            </div>

            {/* 步骤日志 */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">步骤执行</h4>
              <div className="space-y-3">
                {selected.stepLogs?.map((log: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{log.stepType}</span>
                        <span className="text-xs text-gray-400 font-mono">{log.stepId}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{log.duration}ms</span>
                        <StatusBadge status={log.status} />
                      </div>
                    </div>
                    {log.error && (
                      <div className="mt-3 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                        {log.error}
                      </div>
                    )}
                    {log.output && (
                      <div className="mt-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <pre className="font-mono text-gray-700">{JSON.stringify(log.output, null, 2)}</pre>
                      </div>
                    )}
                    {log.screenshot && (
                      <div className="mt-3">
                        <img
                          src={`data:image/png;base64,${log.screenshot}`}
                          alt="screenshot"
                          className="rounded-lg border border-gray-200 max-w-md"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI 修复 */}
            {selected.aiPatches?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">AI 自动修复</h4>
                <div className="space-y-3">
                  {selected.aiPatches.map((patch: any, i: number) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="text-sm font-medium text-amber-800 mb-2">步骤: {patch.stepId}</div>
                      <div className="text-xs text-amber-700 mb-3">{patch.reason}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono">{patch.original}</span>
                        <span className="text-gray-400">→</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono">{patch.fixed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">选择执行记录</h3>
              <p className="text-sm text-gray-400">从左侧列表查看执行详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="text-lg font-bold text-gray-900">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700 ring-green-600/20',
    failed: 'bg-red-100 text-red-700 ring-red-600/20',
    running: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    skipped: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status === 'running' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />}
      {status}
    </span>
  )
}
