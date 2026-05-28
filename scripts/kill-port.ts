// 跨平台端口清理脚本
const port = parseInt(process.argv[2] || '3456')

async function killPort(p: number) {
  try {
    if (process.platform === 'win32') {
      const proc = Bun.spawn(['powershell', '-Command',
        `(Get-NetTCPConnection -LocalPort ${p} -ErrorAction SilentlyContinue).OwningProcess | Where-Object {$_ -ne 0} | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`
      ])
      await proc.exited
    } else {
      const proc = Bun.spawn(['sh', '-c', `lsof -ti :${p} | xargs kill -9 2>/dev/null || true`])
      await proc.exited
    }
  } catch {}
}

await killPort(port)
