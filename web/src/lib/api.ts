const BASE_URL = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

// Workflow API
export const workflowApi = {
  list: () => request<any[]>('/workflows'),
  get: (id: string) => request<any>(`/workflows/${id}`),
  create: (data: { name: string; description?: string; steps?: any[]; inputs?: any }) =>
    request<any>('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  generate: (description: string) =>
    request<any>('/workflows/generate', { method: 'POST', body: JSON.stringify({ description }) }),
  modify: (id: string, feedback: string) =>
    request<any>(`/workflows/${id}/modify`, { method: 'POST', body: JSON.stringify({ feedback }) }),
  delete: (id: string) =>
    request<any>(`/workflows/${id}`, { method: 'DELETE' }),
}

// Execution API
export const executionApi = {
  list: (workflowId?: string) =>
    request<any[]>(`/executions${workflowId ? `?workflowId=${workflowId}` : ''}`),
  get: (id: string) => request<any>(`/executions/${id}`),
  run: (workflowId: string, inputs?: Record<string, any>) =>
    request<any>('/executions', { method: 'POST', body: JSON.stringify({ workflowId, inputs }) }),
}

// Browser API
export const browserApi = {
  status: () => request<any>('/browser/status'),
  launch: () => request<any>('/browser/launch', { method: 'POST' }),
  close: () => request<any>('/browser/close', { method: 'POST' }),
}

// WebSocket
export function createWs(onMessage: (event: string, data: any) => void) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

  ws.onmessage = (msg) => {
    try {
      const { event, data } = JSON.parse(msg.data)
      onMessage(event, data)
    } catch {}
  }

  ws.onerror = (err) => console.error('WebSocket error:', err)

  return ws
}
