import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import WorkflowEditor from './pages/WorkflowEditor'
import ExecutionLogs from './pages/ExecutionLogs'
import Settings from './pages/Settings'

const navItems = [
  { path: '/', label: '仪表盘' },
  { path: '/workflows', label: '流程管理' },
  { path: '/logs', label: '执行日志' },
  { path: '/settings', label: '设置' },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold">RPA Client</h1>
          <p className="text-xs text-gray-500">AI 驱动的自动化平台</p>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t text-xs text-gray-400">
          v0.1.0
        </div>
      </aside>

      {/* 主内容 */}
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
