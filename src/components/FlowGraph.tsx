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
import { memo, useMemo, useEffect, useState, useCallback } from 'react'
import type { GraphResult } from '../lib/api'
import { useLang } from '../contexts/LangContext'
import NodeDetailPanel from './NodeDetailPanel'

interface Props {
  graph: GraphResult
}

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  controller: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  service:    { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  repository: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
}

// 확장된 커스텀 노드
const SpringNode = memo(({ data }: NodeProps) => {
  const d = data as {
    label: string
    layer: string
    methods: string[]
    isKeyClass?: boolean
    isSelected?: boolean
    isDimmed?: boolean
    connectionCount?: number
  }
  const { t } = useLang()
  const style = LAYER_STYLE[d.layer] ?? { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }

  return (
    <div style={{
      background: style.bg,
      border: `1.5px solid ${d.isSelected ? style.text : style.border}`,
      color: style.text,
      borderRadius: 6,
      padding: '4px 8px',
      minWidth: 110,
      fontSize: 11,
      opacity: d.isDimmed ? 0.25 : 1,
      boxShadow: d.isSelected ? `0 0 0 3px ${style.border}55, 0 4px 12px rgba(0,0,0,0.15)` : undefined,
      transition: 'opacity 0.15s, box-shadow 0.15s',
      position: 'relative',
      cursor: 'pointer',
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {/* 핵심 클래스 ★ 배지 */}
      {d.isKeyClass && (
        <div style={{
          position: 'absolute',
          top: -7,
          right: -7,
          background: '#f59e0b',
          color: '#fff',
          borderRadius: '50%',
          width: 16,
          height: 16,
          fontSize: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          zIndex: 1,
        }}>
          ★
        </div>
      )}

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

      {/* 연결 수 */}
      {(d.connectionCount ?? 0) > 0 && (
        <div style={{ fontSize: 9, opacity: 0.4, marginTop: 2 }}>
          ⟷ {d.connectionCount}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
})
SpringNode.displayName = 'SpringNode'

// 방사형 레이아웃
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

// 가로 레이어드 레이아웃: Controller → Service → Repository (좌→우)
function computeLayeredLayout(nodes: Node[]): Map<string, { x: number; y: number }> {
  const LAYER_X: Record<string, number> = {
    controller: 0,
    service: 420,
    repository: 840,
  }
  const VERTICAL_GAP = 160

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
      const y = (i - (ids.length - 1) / 2) * VERTICAL_GAP
      pos.set(id, { x, y })
    })
  })

  return pos
}

// 엣지 label에서 기능(메서드명) 목록 추출
function extractFeatures(graphEdges: GraphResult['edges']): string[] {
  const methods = new Set<string>()
  graphEdges.forEach(e => {
    e.label?.toString().split(',').forEach(part => {
      const name = part.replace(/\(.*?\)/, '').trim()
      if (name) methods.add(name)
    })
  })
  return Array.from(methods).sort()
}

// 기능 기반 노드/엣지 필터링 + 레이어드 레이아웃 적용
function filterByFeature(
  nodes: Node[],
  edges: Edge[],
  feature: string,
): { nodes: Node[]; edges: Edge[] } {
  if (feature === 'all') return { nodes, edges }

  const regex = new RegExp(`\\b${feature}\\s*\\(`)
  const matched = edges.filter(e => regex.test(e.label?.toString() ?? ''))
  const nodeIds = new Set(matched.flatMap(e => [e.source, e.target]))
  const filteredNodes = nodes.filter(n => nodeIds.has(n.id))

  const pos = computeLayeredLayout(filteredNodes)
  const repositionedNodes = filteredNodes.map(n => ({
    ...n,
    position: pos.get(n.id) ?? n.position,
  }))

  return { nodes: repositionedNodes, edges: matched }
}

// 필터/레이아웃 변경 시 fitView 재호출
function FitOnChange({ feature, layout }: { feature: string; layout: string }) {
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
  }, [feature, layout, fitView])

  return null
}

export default function FlowGraph({ graph }: Props) {
  const [selectedFeature, setSelectedFeature] = useState('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [layoutMode, setLayoutMode] = useState<'radial' | 'layered'>('radial')
  const { t } = useLang()
  const nodeTypes = useMemo(() => ({ spring: SpringNode }), [])

  // 핵심 클래스: 연결 수 상위 3개
  const keyClassIds = useMemo(() => {
    const count = new Map<string, number>()
    graph.edges.forEach(e => {
      count.set(e.source, (count.get(e.source) ?? 0) + 1)
      count.set(e.target, (count.get(e.target) ?? 0) + 1)
    })
    return new Set(
      [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
    )
  }, [graph.edges])

  // 검색 매칭 노드
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    return new Set(graph.nodes.filter(n => n.data.label.toLowerCase().includes(q)).map(n => n.id))
  }, [searchQuery, graph.nodes])

  // 노드별 연결 수
  const connectionCountMap = useMemo(() => {
    const count = new Map<string, number>()
    graph.edges.forEach(e => {
      count.set(e.source, (count.get(e.source) ?? 0) + 1)
      count.set(e.target, (count.get(e.target) ?? 0) + 1)
    })
    return count
  }, [graph.edges])

  // 기본 레이아웃 노드 (선택/검색 오버레이 제외)
  const allNodes: Node[] = useMemo(() => {
    const ids = graph.nodes.map(n => n.id)
    const baseNodes: Node[] = graph.nodes.map(n => ({
      id: n.id,
      type: 'spring',
      position: { x: 0, y: 0 },
      data: {
        label: n.data.label,
        layer: n.data.layer,
        methods: n.data.methods,
        isKeyClass: keyClassIds.has(n.id),
        connectionCount: connectionCountMap.get(n.id) ?? 0,
        // 초기값 — useEffect에서 업데이트됨
        isSelected: false,
        isDimmed: false,
      },
    }))

    const pos = layoutMode === 'layered'
      ? computeLayeredLayout(baseNodes)
      : computeRadialLayout(ids, graph.edges)

    return baseNodes.map(n => ({ ...n, position: pos.get(n.id) ?? { x: 0, y: 0 } }))
  }, [graph, keyClassIds, connectionCountMap, layoutMode])

  // 엣지 — 소스 레이어 색상 사용
  const allEdges: Edge[] = useMemo(() => {
    const nodeLayerMap = new Map<string, string>()
    graph.nodes.forEach(n => nodeLayerMap.set(n.id, n.data.layer))

    return graph.edges.map(e => {
      const layer = nodeLayerMap.get(e.source) ?? ''
      const color = LAYER_STYLE[layer]?.border ?? '#9ca3af'
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'straight',
        animated: true,
        style: { stroke: color, strokeWidth: 2, opacity: 0.65 },
        labelStyle: { fontSize: 10, fill: '#6b7280' },
        labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.8 },
      }
    })
  }, [graph])

  // 기능 목록
  const featureList = useMemo(() => extractFeatures(graph.edges), [graph])

  // 기능 필터 적용
  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(
    () => filterByFeature(allNodes, allEdges, selectedFeature),
    [selectedFeature, allNodes, allEdges]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges)

  // 필터/레이아웃 변경 시 노드/엣지 리셋
  useEffect(() => {
    setNodes(filteredNodes)
    setEdges(filteredEdges)
  }, [filteredNodes, filteredEdges, setNodes, setEdges])

  // 선택/검색 변경 시 포지션 유지하며 data만 업데이트
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        isSelected: selectedNodeId === n.id,
        isDimmed: searchQuery.trim() !== '' && !searchMatches.has(n.id),
      },
    })))
  }, [selectedNodeId, searchQuery, searchMatches, setNodes])

  // 노드 클릭 — 토글 선택
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(prev => prev === node.id ? null : node.id)
  }, [])

  // NodeDetailPanel 데이터
  const selectedNode = useMemo(
    () => selectedNodeId ? graph.nodes.find(n => n.id === selectedNodeId) ?? null : null,
    [selectedNodeId, graph.nodes]
  )

  const nodeLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    graph.nodes.forEach(n => map.set(n.id, n.data.label))
    return map
  }, [graph.nodes])

  const panelInEdges = useMemo(() =>
    selectedNodeId
      ? graph.edges
          .filter(e => e.target === selectedNodeId)
          .map(e => ({ sourceLabel: nodeLabelMap.get(e.source) ?? e.source, methods: e.label }))
      : [],
    [selectedNodeId, graph.edges, nodeLabelMap]
  )

  const panelOutEdges = useMemo(() =>
    selectedNodeId
      ? graph.edges
          .filter(e => e.source === selectedNodeId)
          .map(e => ({ targetLabel: nodeLabelMap.get(e.target) ?? e.target, methods: e.label }))
      : [],
    [selectedNodeId, graph.edges, nodeLabelMap]
  )

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 컨트롤 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* 검색 인풋 */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t.graph.searchPlaceholder}
          style={{
            padding: '5px 10px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
            color: '#374151',
            background: '#fff',
            width: 160,
            outline: 'none',
          }}
        />

        {/* 기능 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
        </div>

        {/* 레이아웃 토글 */}
        <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #d1d5db', overflow: 'hidden' }}>
          {(['radial', 'layered'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setLayoutMode(mode)}
              style={{
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: layoutMode === mode ? '#374151' : '#fff',
                color: layoutMode === mode ? '#fff' : '#6b7280',
                transition: 'background 0.15s',
              }}
            >
              {mode === 'radial' ? t.graph.layoutRadial : t.graph.layoutLayered}
            </button>
          ))}
        </div>

        {/* 통계 */}
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
          {t.graph.nodeCount(nodes.length)} · {t.graph.edgeCount(edges.length)} · ★{keyClassIds.size}
        </span>
      </div>

      {/* 그래프 */}
      <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.05}
          maxZoom={2}
        >
          <FitOnChange feature={selectedFeature} layout={layoutMode} />
          <Background gap={20} color="#e5e7eb" />
          <Controls />
          <MiniMap
            nodeColor={n => {
              const layer = graph.nodes.find(gn => gn.id === n.id)?.data.layer ?? ''
              return LAYER_STYLE[layer]?.bg ?? '#f3f4f6'
            }}
          />
        </ReactFlow>

        {/* 노드 상세 패널 */}
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          inEdges={panelInEdges}
          outEdges={panelOutEdges}
          isKeyClass={selectedNodeId ? keyClassIds.has(selectedNodeId) : false}
        />
      </div>
    </div>
  )
}
