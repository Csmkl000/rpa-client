import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { workflowApi, executionApi, browserApi } from '../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState({ workflows: 0, executions: 0, running: 0 })
  const [browserStatus, setBrowserStatus] = useState<any>(null)
  const [recentExecutions, setRecentExecutions] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [workflows, executions, browser] = await Promise.all([
        workflowApi.list(),
        executionApi.list(),
        browserApi.status(),
      ])
      setStats({
        workflows: workflows.length,
        executions: executions.length,
        running: executions.filter(e => e.status === 'running').length,
      })
      setBrowserStatus(browser)
      setRecentExecutions(executions.slice(0, 10))
    } catch (err) {
      console.error('加载数据失败:', err)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="流程数量" value={stats.workflows} />
        <StatCard label="执行总数" value={stats.executions} />
        <StatCard label="运行中" value={stats.running} color="text-blue-600" />
        <StatCard
          label="浏览器状态"
          value={browserStatus?.connected ? '已连接' : '未连接'}
          color={browserStatus?.connected ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* 快速操作 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">快速操作</h3>
        <div className="flex gap-3">
          <Link
            to="/workflows"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            创建流程
          </Link>
          <button
            onClick={async () => {
              await browserApi.launch()
              loadData()
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
          >
            启动浏览器
          </button>
        </div>
      </div>

      {/* 最近执行 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">最近执行</h3>
        {recentExecutions.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无执行记录</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">执行 ID</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">流程</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">状态</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">耗时</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentExecutions.map((exec) => (
                  <tr key={exec.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{exec.id.slice(0, 8)}</td>
                    <td className="px-4 py-2">{exec.workflowId.slice(0, 8)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(exec.startedAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
    partial: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}
