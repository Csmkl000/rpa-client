import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { workflowApi, executionApi, browserApi } from '../lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState({ workflows: 0, executions: 0, running: 0, successRate: 0 })
  const [browserStatus, setBrowserStatus] = useState<any>(null)
  const [recentExecutions, setRecentExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      const successCount = executions.filter(e => e.status === 'success').length
      setStats({
        workflows: workflows.length,
        executions: executions.length,
        running: executions.filter(e => e.status === 'running').length,
        successRate: executions.length > 0 ? Math.round(successCount / executions.length * 100) : 0,
      })
      setBrowserStatus(browser)
      setRecentExecutions(executions.slice(0, 5))
    } catch (err) {
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">仪表盘</h2>
        <p className="text-sm text-gray-500 mt-1">查看系统状态和最近活动</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <Card title="流程数量" value={stats.workflows} icon="⚡" color="blue" />
        <Card title="执行总数" value={stats.executions} icon="📋" color="purple" />
        <Card title="运行中" value={stats.running} icon="▶️" color="green" />
        <Card
          title="浏览器状态"
          value={browserStatus?.connected ? '已连接' : '未连接'}
          icon="🌐"
          color={browserStatus?.connected ? 'green' : 'red'}
        />
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">快速操作</h3>
        <div className="flex gap-3">
          <Link
            to="/workflows"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
          >
            <span>⚡</span> 创建流程
          </Link>
          <button
            onClick={async () => {
              await browserApi.launch()
              loadData()
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <span>🌐</span> 启动浏览器
          </button>
        </div>
      </div>

      {/* 最近执行 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">最近执行</h3>
          <Link to="/logs" className="text-sm text-blue-500 hover:text-blue-600">查看全部 →</Link>
        </div>
        {recentExecutions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            暂无执行记录，去流程管理页面创建并运行一个流程
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">执行 ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">流程</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">耗时</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentExecutions.map((exec) => (
                <tr key={exec.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{exec.id.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-gray-900">{exec.workflowId.slice(0, 8)}</td>
                  <td className="px-6 py-3"><StatusBadge status={exec.status} /></td>
                  <td className="px-6 py-3 text-gray-500">{exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '-'}</td>
                  <td className="px-6 py-3 text-gray-500">{new Date(exec.startedAt).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Card({ title, value, icon, color }: { title: string; value: any; icon: string; color: string }) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${bgColors[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-700 ring-green-600/20',
    failed: 'bg-red-100 text-red-700 ring-red-600/20',
    running: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    partial: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${styles[status] || 'bg-gray-100 text-gray-700 ring-gray-600/20'}`}>
      {status === 'running' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />}
      {status}
    </span>
  )
}
