import { useState } from 'react'
import type { CodeIssue } from '../lib/api'

interface Props {
  issues: CodeIssue[]
  isPaid: boolean
  onUpgrade: () => void
}

const SEVERITY_CONFIG = {
  BLOCKER:  { label: 'Blocker',  bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   color: '#f87171', dot: '#ef4444',  icon: '🔴' },
  CRITICAL: { label: 'Critical', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  color: '#fb923c', dot: '#f97316', icon: '🟠' },
  MAJOR:    { label: 'Major',    bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)',   color: '#facc15', dot: '#eab308', icon: '🟡' },
  MINOR:    { label: 'Minor',    bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)',  color: '#60a5fa', dot: '#3b82f6', icon: '🔵' },
  INFO:     { label: 'Info',     bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)',color: 'var(--text-muted)', dot: 'rgba(255,255,255,0.3)', icon: '⚪' },
} as const

const FREE_LIMIT = 3

export default function IssuePanel({ issues, isPaid, onUpgrade }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">✅</span>
        <p className="font-medium" style={{ color: 'var(--mint)' }}>이슈가 발견되지 않았습니다</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>분석된 코드에서 탐지된 문제가 없습니다</p>
      </div>
    )
  }

  const countBySeverity = issues.reduce<Record<string, number>>((acc, iss) => {
    acc[iss.severity] = (acc[iss.severity] ?? 0) + 1
    return acc
  }, {})

  const filteredIssues = filterSeverity
    ? issues.filter(i => i.severity === filterSeverity)
    : issues

  const visibleIssues = isPaid ? filteredIssues : filteredIssues.slice(0, FREE_LIMIT)
  const hiddenCount = isPaid ? 0 : Math.max(0, filteredIssues.length - FREE_LIMIT)

  return (
    <div className="flex flex-col gap-4">

      {/* 요약 카드 */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            총 {issues.length}개 이슈 발견
          </h3>
          {!isPaid && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>무료 플랜: 상위 {FREE_LIMIT}개 표시</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterSeverity(null)}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
            style={
              filterSeverity === null
                ? { background: 'linear-gradient(135deg, var(--purple), var(--mint))', color: 'white', border: '1px solid transparent' }
                : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }
          >
            전체 {issues.length}
          </button>
          {(Object.keys(SEVERITY_CONFIG) as Array<keyof typeof SEVERITY_CONFIG>)
            .filter(s => countBySeverity[s])
            .map(sev => {
              const cfg = SEVERITY_CONFIG[sev]
              const isActive = filterSeverity === sev
              return (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(isActive ? null : sev)}
                  className="text-xs px-2.5 py-1 rounded-full font-medium transition-all"
                  style={
                    isActive
                      ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                      : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }
                >
                  {cfg.icon} {cfg.label} {countBySeverity[sev]}
                </button>
              )
            })}
        </div>
      </div>

      {/* 이슈 목록 */}
      <div className="flex flex-col gap-2">
        {visibleIssues.map((issue, idx) => {
          const cfg = SEVERITY_CONFIG[issue.severity]
          const isExpanded = expanded === idx
          return (
            <div
              key={idx}
              className="rounded-xl overflow-hidden transition-all"
              style={{ background: 'var(--surface)', border: `1px solid var(--border)` }}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : idx)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: cfg.dot }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{issue.rule_id}</span>
                    {issue.cwe && (
                      <a
                        href={`https://cwe.mitre.org/data/definitions/${issue.cwe.replace('CWE-', '')}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-1.5 py-0.5 rounded font-mono font-medium transition-colors hover:opacity-80"
                        style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--purple-light)', border: '1px solid rgba(124,58,237,0.3)' }}
                      >
                        {issue.cwe} ↗
                      </a>
                    )}
                    {issue.owasp && (
                      <a
                        href="https://owasp.org/Top10/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-1.5 py-0.5 rounded font-medium transition-colors hover:opacity-80"
                        style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}
                      >
                        OWASP {issue.owasp} ↗
                      </a>
                    )}
                  </div>
                  <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text)' }}>{issue.message}</p>
                  <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                    {issue.file}:{issue.line}
                  </p>
                </div>
                <span className="text-xs shrink-0 mt-1" style={{ color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div
                  className="px-4 py-3"
                  style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--mint)' }}>💡 수정 방법</p>
                  <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
                    {issue.suggestion}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 잠긴 이슈 (무료 플랜) */}
        {hiddenCount > 0 && (
          <div className="relative">
            <div
              className="rounded-xl px-4 py-3 blur-sm pointer-events-none select-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <div>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c' }}>Critical</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>숨겨진 이슈가 있습니다...</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>src/main/Service.java:42</p>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
              style={{ background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-bright)' }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                🔒 {hiddenCount}개 이슈가 더 있습니다
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>온보딩 가이드 결제 시 전체 이슈를 확인하세요</p>
              <button
                onClick={onUpgrade}
                className="aurora-btn px-4 py-2 rounded-lg text-xs font-semibold"
              >
                전체 이슈 보기 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
