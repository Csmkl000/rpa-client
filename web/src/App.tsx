import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import WorkflowEditor from './pages/WorkflowEditor'
import ExecutionLogs from './pages/ExecutionLogs'
import Settings from './pages/Settings'
import { useBrowserStore } from './stores/browser'

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/workflows', label: '流程管理', icon: '⚡' },
  { path: '/logs', label: '执行日志', icon: '📋' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export default function App() {
  const location = useLocation()
  const { connected, check } = useBrowserStore()

  useEffect(() => {
    check()
    const timer = setInterval(check, 3000)
    return () => clearInterval(timer)
  }, [check])

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      <aside className="w-60 bg-[#1a1a2e] text-white flex flex-col shadow-xl">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">R</div>
            <div>
              <h1 className="text-base font-bold tracking-tight">RPA Client</h1>
              <p className="text-[10px] text-white/40">AI 驱动的自动化平台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-blue-500/20 text-blue-400 font-medium'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/50">
              浏览器 {connected ? '已连接' : '未连接'}
            </span>
          </div>
          <div className="text-[10px] text-white/20 mt-2">v0.1.0</div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowEditor />} />
          <Route path="/workflows/:id" element={<WorkflowEditor />} />
          <Route path="/logs" element={<ExecutionLogs />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
