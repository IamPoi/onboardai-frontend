import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  useNodesInitialized,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import { memo, useMemo, useEffect, useState } from 'react'
import type { GraphResult } from '../lib/api'
import { useLang } from '../contexts/LangContext'

interface Props {
  graph: GraphResult
}

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  controller: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  service:    { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  repository: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
}

// 커스텀 노드
const SpringNode = memo(({ data }: NodeProps) => {
  const d = data as { label: string; layer: string; methods: string[] }
  const { t } = useLang()
  const style = LAYER_STYLE[d.layer] ?? { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
  return (
    <div style={{
      background: style.bg,
      border: `1.5px solid ${style.border}`,
      color: style.text,
      borderRadius: 6,
      padding: '4px 8px',
      minWidth: 110,
      fontSize: 11,
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{d.label}</div>
      <div style={{ fontSize: 10, opacity: 0.55, textTransform: 'capitalize' }}>{d.layer}</div>
      {(d.methods?.length ?? 0) > 0 && (
        <div style={{ marginTop: 4, borderTop: `1px solid ${style.border}40`, paddingTop: 3 }}>
          {d.methods?.slice(0, 4).map(m => (
            <div key={m} style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.7 }}>{m}()</div>
          ))}
          {d.methods.length > 4 && (
            <div style={{ fontSize: 10, opacity: 0.4 }}>{t.graph.moreItems(d.methods.length - 4)}</div>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
})
SpringNode.displayName = 'SpringNode'

// 다중 컴포넌트 방사형 레이아웃 (가로 배치)
function computeRadialLayout(
  nodeIds: string[],
  graphEdges: GraphResult['edges'],
): Map<string, { x: number; y: number }> {
  if (nodeIds.length === 0) return new Map()

  const adj = new Map<string, string[]>()
  const degree = new Map<string, number>()
  nodeIds.forEach(id => { adj.set(id, []); degree.set(id, 0) })
  graphEdges.forEach(e => {
    if (!adj.has(e.source) || !adj.has(e.target)) return
    adj.get(e.source)?.push(e.target)
    adj.get(e.target)?.push(e.source)
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1)
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1)
  })

  const visited = new Set<string>()
  const components: string[][] = []
  const isolated: string[] = []

  nodeIds.forEach(id => {
    if (visited.has(id)) return
    if ((degree.get(id) ?? 0) === 0) { isolated.push(id); visited.add(id); return }
    const comp: string[] = []
    const q = [id]
    visited.add(id)
    while (q.length > 0) {
      const cur = q.shift()!
      comp.push(cur)
      adj.get(cur)?.forEach(nb => { if (!visited.has(nb)) { visited.add(nb); q.push(nb) } })
    }
    components.push(comp)
  })

  components.sort((a, b) => b.length - a.length)

  const NODE_W = 140
  const MIN_RADIUS = 200
  const RADIUS_STEP = 180
  const COMPONENT_GAP = 600
  const pos = new Map<string, { x: number; y: number }>()
  let xOffset = 0
  let globalMaxR = 0

  components.forEach(comp => {
    const root = comp.reduce((a, b) => (degree.get(a) ?? 0) >= (degree.get(b) ?? 0) ? a : b)
    const lvlMap = new Map<string, number>()
    const bq = [root]
    lvlMap.set(root, 0)
    while (bq.length > 0) {
      const cur = bq.shift()!
      adj.get(cur)?.forEach(nb => {
        if (!lvlMap.has(nb)) { lvlMap.set(nb, lvlMap.get(cur)! + 1); bq.push(nb) }
      })
    }

    const byLevel = new Map<number, string[]>()
    lvlMap.forEach((lv, id) => {
      if (!byLevel.has(lv)) byLevel.set(lv, [])
      byLevel.get(lv)!.push(id)
    })

    let maxR = 0
    byLevel.forEach((ids, lv) => {
      if (lv === 0) {
        pos.set(ids[0], { x: xOffset, y: 0 })
      } else {
        const circumference = ids.length * NODE_W * 1.4
        const r = Math.max(MIN_RADIUS + lv * RADIUS_STEP, circumference / (2 * Math.PI))
        maxR = Math.max(maxR, r)
        ids.forEach((id, i) => {
          const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2
          pos.set(id, { x: xOffset + Math.cos(angle) * r, y: Math.sin(angle) * r })
        })
      }
    })

    globalMaxR = Math.max(globalMaxR, maxR)
    xOffset += maxR * 2 + COMPONENT_GAP
  })

  isolated.forEach((id, i) => pos.set(id, { x: xOffset, y: globalMaxR + 200 + i * 150 }))
  return pos
}

// 엣지 label에서 기능(메서드명) 목록 추출
function extractFeatures(graphEdges: GraphResult['edges']): string[] {
  const methods = new Set<string>()
  graphEdges.forEach(e => {
    // "findById(), save()" → ['findById', 'save']
    e.label?.toString().split(',').forEach(part => {
      const name = part.replace(/\(.*?\)/, '').trim()
      if (name) methods.add(name)
    })
  })
  return Array.from(methods).sort()
}

// 가로 레이어드 레이아웃: Controller → Service → Repository (좌→우)
// - 같은 레이어 내 노드는 세로 중앙 정렬
function computeLayeredLayout(nodes: Node[]): Map<string, { x: number; y: number }> {
  const LAYER_X: Record<string, number> = {
    controller: 0,
    service: 420,
    repository: 840,
  }
  const VERTICAL_GAP = 160

  // 레이어별 그룹핑
  const byLayer = new Map<string, string[]>()
  nodes.forEach(n => {
    const layer = (n.data as { layer: string }).layer
    if (!byLayer.has(layer)) byLayer.set(layer, [])
    byLayer.get(layer)!.push(n.id)
  })

  const pos = new Map<string, { x: number; y: number }>()
  byLayer.forEach((ids, layer) => {
    const x = LAYER_X[layer] ?? 1260
    ids.forEach((id, i) => {
      // 세로 중앙 정렬: 중앙 기준으로 위아래 분산
      const y = (i - (ids.length - 1) / 2) * VERTICAL_GAP
      pos.set(id, { x, y })
    })
  })

  return pos
}

// 기능 기반 노드/엣지 필터링 + 가로 레이아웃 좌표 적용
function filterByFeature(
  nodes: Node[],
  edges: Edge[],
  feature: string,
): { nodes: Node[]; edges: Edge[] } {
  if (feature === 'all') return { nodes, edges }

  // 정규식으로 매칭 — 인자나 공백 유연하게 처리
  const regex = new RegExp(`\\b${feature}\\s*\\(`)
  const matched = edges.filter(e => regex.test(e.label?.toString() ?? ''))
  const nodeIds = new Set(matched.flatMap(e => [e.source, e.target]))
  const filteredNodes = nodes.filter(n => nodeIds.has(n.id))

  // 필터링된 노드에 가로 레이어드 레이아웃 적용
  const pos = computeLayeredLayout(filteredNodes)
  const repositionedNodes = filteredNodes.map(n => ({
    ...n,
    position: pos.get(n.id) ?? n.position,
  }))

  return { nodes: repositionedNodes, edges: matched }
}

// 필터 변경 시 fitView 재호출
function FitOnFeatureChange({ feature }: { feature: string }) {
  const { fitView } = useReactFlow()
  const initialized = useNodesInitialized()

  useEffect(() => {
    if (initialized) {
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.15, duration: 400 })
      })
    }
  }, [initialized, fitView])

  useEffect(() => {
    window.requestAnimationFrame(() => {
      fitView({ padding: 0.15, duration: 400 })
    })
  }, [feature, fitView])

  return null
}

export default function FlowGraph({ graph }: Props) {
  const [selectedFeature, setSelectedFeature] = useState('all')
  const { t } = useLang()
  const nodeTypes = useMemo(() => ({ spring: SpringNode }), [])

  // 전체 노드/엣지 (레이아웃 포함)
  const allNodes: Node[] = useMemo(() => {
    const ids = graph.nodes.map(n => n.id)
    const pos = computeRadialLayout(ids, graph.edges)
    return graph.nodes.map(n => ({
      id: n.id,
      type: 'spring',
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      data: { label: n.data.label, layer: n.data.layer, methods: n.data.methods },
    }))
  }, [graph])

  const allEdges: Edge[] = useMemo(() => graph.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'straight',
    animated: true,
    style: { stroke: '#9ca3af', strokeWidth: 2, opacity: 0.7 },
    labelStyle: { fontSize: 10, fill: '#6b7280' },
    labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.8 },
  })), [graph])

  // 기능 목록
  const featureList = useMemo(() => extractFeatures(graph.edges), [graph])

  // 필터링된 노드/엣지
  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(
    () => filterByFeature(allNodes, allEdges, selectedFeature),
    [selectedFeature, allNodes, allEdges]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges)

  // 필터 변경 시 노드/엣지 업데이트
  useEffect(() => {
    setNodes(filteredNodes)
    setEdges(filteredEdges)
  }, [filteredNodes, filteredEdges, setNodes, setEdges])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 기능 셀렉트박스 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{t.graph.filterLabel}</label>
        <select
          value={selectedFeature}
          onChange={e => setSelectedFeature(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
            color: '#374151',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="all">{t.graph.filterAll}</option>
          {featureList.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {t.graph.nodeCount(nodes.length)} · {t.graph.edgeCount(edges.length)}
        </span>
      </div>

      {/* 그래프 */}
      <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.05}
          maxZoom={2}
        >
          <FitOnFeatureChange feature={selectedFeature} />
          <Background gap={20} color="#e5e7eb" />
          <Controls />
          <MiniMap
            nodeColor={n => {
              const layer = graph.nodes.find(gn => gn.id === n.id)?.data.layer ?? ''
              return LAYER_STYLE[layer]?.bg ?? '#f3f4f6'
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
