import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface Step {
  id: string
  type: string
  instruction?: string
  selector?: string
  url?: string
  value?: string
}

interface Props {
  steps: Step[]
}

// 步骤类型 → 颜色
const stepColors: Record<string, string> = {
  navigate: '#3b82f6',
  act: '#8b5cf6',
  click: '#10b981',
  fill: '#f59e0b',
  extract: '#06b6d4',
  assert: '#ef4444',
  wait: '#6b7280',
  screenshot: '#ec4899',
}

const stepIcons: Record<string, string> = {
  navigate: '🌐',
  act: '🤖',
  click: '👆',
  fill: '✏️',
  extract: '📦',
  assert: '✓',
  wait: '⏳',
  screenshot: '📸',
}

export default function FlowCanvas({ steps }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = steps.map((step, i) => ({
      id: step.id,
      position: { x: 250, y: i * 100 },
      data: {
        label: (
          <div className="flex items-center gap-2 text-sm">
            <span>{stepIcons[step.type] || '⚙️'}</span>
            <span className="font-medium">{step.type}</span>
          </div>
        ),
        description: step.instruction || step.selector || step.url || '',
      },
      style: {
        background: stepColors[step.type] || '#6b7280',
        color: 'white',
        borderRadius: '8px',
        padding: '8px 16px',
        width: 220,
      },
    }))

    const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
      id: `${step.id}-${steps[i + 1].id}`,
      source: step.id,
      target: steps[i + 1].id,
      animated: true,
      style: { stroke: '#94a3b8' },
    }))

    return { nodes, edges }
  }, [steps])

  if (steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        暂无步骤
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
