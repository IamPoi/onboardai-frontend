import { useState } from 'react'
import type { CodeIssue } from '../lib/api'

interface Props {
  issues: CodeIssue[]
  isPaid: boolean          // 유료 여부 — false면 Top 3만 표시
  onUpgrade: () => void   // 결제 유도 콜백
}

const SEVERITY_CONFIG = {
  BLOCKER:  { label: 'Blocker',  color: 'bg-red-100 text-red-700 border-red-200',      dot: 'bg-red-500',    icon: '🔴' },
  CRITICAL: { label: 'Critical', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', icon: '🟠' },
  MAJOR:    { label: 'Major',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', icon: '🟡' },
  MINOR:    { label: 'Minor',    color: 'bg-blue-100 text-blue-600 border-blue-200',    dot: 'bg-blue-400',   icon: '🔵' },
  INFO:     { label: 'Info',     color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400',  icon: '⚪' },
} as const

const FREE_LIMIT = 3

export default function IssuePanel({ issues, isPaid, onUpgrade }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">✅</span>
        <p className="text-slate-600 font-medium">이슈가 발견되지 않았습니다</p>
        <p className="text-xs text-slate-400 mt-1">분석된 코드에서 탐지된 문제가 없습니다</p>
      </div>
    )
  }

  // 심각도별 카운트
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
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            총 {issues.length}개 이슈 발견
          </h3>
          {!isPaid && (
            <span className="text-xs text-slate-400">무료 플랜: 상위 {FREE_LIMIT}개 표시</span>
          )}
        </div>

        {/* 심각도별 필터 버튼 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterSeverity(null)}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
              filterSeverity === null
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            전체 {issues.length}
          </button>
          {(Object.keys(SEVERITY_CONFIG) as Array<keyof typeof SEVERITY_CONFIG>)
            .filter(s => countBySeverity[s])
            .map(sev => {
              const cfg = SEVERITY_CONFIG[sev]
              return (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    filterSeverity === sev
                      ? `${cfg.color} font-semibold`
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
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
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
            >
              {/* 이슈 헤더 */}
              <button
                onClick={() => setExpanded(isExpanded ? null : idx)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{issue.rule_id}</span>
                    {issue.cwe && (
                      <a
                        href={`https://cwe.mitre.org/data/definitions/${issue.cwe.replace('CWE-', '')}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs px-1.5 py-0.5 rounded border font-mono font-medium
                                   bg-violet-50 text-violet-700 border-violet-200
                                   hover:bg-violet-100 transition-colors"
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
                        className="text-xs px-1.5 py-0.5 rounded border font-medium
                                   bg-orange-50 text-orange-700 border-orange-200
                                   hover:bg-orange-100 transition-colors"
                      >
                        OWASP {issue.owasp} ↗
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-1 font-medium">{issue.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                    {issue.file}:{issue.line}
                  </p>
                </div>
                <span className="text-slate-300 text-xs shrink-0 mt-1">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* 펼침: 수정 방법 */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">💡 수정 방법</p>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
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
            {/* 블러 미리보기 */}
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 blur-sm pointer-events-none select-none">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <div>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">Critical</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">숨겨진 이슈가 있습니다...</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">src/main/Service.java:42</p>
                </div>
              </div>
            </div>

            {/* 업그레이드 오버레이 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-1">
                🔒 {hiddenCount}개 이슈가 더 있습니다
              </p>
              <p className="text-xs text-slate-400 mb-3">온보딩 가이드 결제 시 전체 이슈를 확인하세요</p>
              <button
                onClick={onUpgrade}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
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
