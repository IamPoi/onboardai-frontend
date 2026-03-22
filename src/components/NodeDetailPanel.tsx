import type { GraphNode } from '../lib/api'
import { useLang } from '../contexts/LangContext'

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  controller: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  service:    { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  repository: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
}

interface Props {
  node: GraphNode | null
  onClose: () => void
  inEdges: { sourceLabel: string; methods: string }[]
  outEdges: { targetLabel: string; methods: string }[]
  isKeyClass: boolean
}

export default function NodeDetailPanel({ node, onClose, inEdges, outEdges, isKeyClass }: Props) {
  const { t } = useLang()
  if (!node) return null

  const style = LAYER_STYLE[node.data.layer] ?? { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      width: 280,
      height: '100%',
      background: '#fff',
      borderLeft: `1px solid ${style.border}`,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
    }}>
      {/* 헤더 */}
      <div style={{
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        padding: '12px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: style.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {node.data.label}
          </div>
          <div style={{ fontSize: 11, color: style.text, opacity: 0.65, textTransform: 'capitalize', marginTop: 2 }}>
            {node.data.layer}
          </div>
          {isKeyClass && (
            <div style={{
              marginTop: 5,
              fontSize: 10,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              borderRadius: 4,
              padding: '1px 6px',
              display: 'inline-block',
              fontWeight: 600,
            }}>
              ★ {t.graph.keyClass}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            fontSize: 18,
            lineHeight: 1,
            color: style.text,
            opacity: 0.5,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '2px 4px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 메서드 목록 */}
        {node.data.methods.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {t.graph.methods}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {node.data.methods.map(m => (
                <div key={m} style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#374151',
                  background: '#f9fafb',
                  border: '1px solid #f3f4f6',
                  borderRadius: 4,
                  padding: '3px 7px',
                }}>
                  {m}()
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INCOMING 의존성 */}
        {inEdges.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              ← {t.graph.incomingDeps}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {inEdges.map((e, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  padding: '5px 8px',
                  background: '#eff6ff',
                  borderLeft: '3px solid #3b82f6',
                  borderRadius: '0 4px 4px 0',
                }}>
                  <div style={{ color: '#1d4ed8', fontWeight: 600, fontFamily: 'monospace' }}>{e.sourceLabel}</div>
                  {e.methods && (
                    <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{e.methods}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTGOING 의존성 */}
        {outEdges.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              → {t.graph.outgoingDeps}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {outEdges.map((e, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  padding: '5px 8px',
                  background: '#f0fdf4',
                  borderLeft: '3px solid #22c55e',
                  borderRadius: '0 4px 4px 0',
                }}>
                  <div style={{ color: '#15803d', fontWeight: 600, fontFamily: 'monospace' }}>{e.targetLabel}</div>
                  {e.methods && (
                    <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{e.methods}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {inEdges.length === 0 && outEdges.length === 0 && node.data.methods.length === 0 && (
          <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingTop: 20 }}>
            No connections
          </div>
        )}
      </div>
    </div>
  )
}
