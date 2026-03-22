import { useState } from 'react'
import { onboardingApi, type OnboardingResult } from '../lib/api'
import { useLang } from '../contexts/LangContext'

const LAYER_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  controller: { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  service:    { bg: 'rgba(52,211,153,0.15)',  color: 'var(--mint)', border: 'rgba(52,211,153,0.3)' },
  repository: { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  view:       { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  model:      { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  router:     { bg: 'rgba(96,165,250,0.15)',  color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
}

interface Props {
  lang: 'ko' | 'en'
  prefilledUrl?: string | null
  preloadedResult?: OnboardingResult | null
}

function parseChecklist(tip: string): string[] {
  const lines = tip.split(/\n|(?:\d+\.\s)|(?:[-•]\s)/).map(l => l.trim()).filter(Boolean)
  return lines.length >= 2 ? lines : [tip]
}

export default function OnboardingGuide({ lang, prefilledUrl, preloadedResult }: Props) {
  const { t } = useLang()
  const [url, setUrl] = useState(prefilledUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OnboardingResult | null>(preloadedResult ?? null)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setError(null); setResult(null); setChecked({})
    try {
      setResult(await onboardingApi(url.trim(), lang))
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setError(null); setUrl(''); setChecked({}) }

  if (result) {
    const checklist = parseChecklist(result.onboarding_tip)
    const completedCount = Object.values(checked).filter(Boolean).length

    return (
      <div className="flex flex-col gap-4">

        {/* 상단 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--purple), var(--mint))', color: 'white' }}
            >
              Premium
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI 온보딩 가이드</span>
          </div>
          <button
            onClick={reset}
            className="text-xs transition-colors hover:opacity-100"
            style={{ color: 'var(--text-muted)' }}
          >
            초기화
          </button>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 아키텍처 요약 — 전폭 */}
          <div
            className="md:col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(52,211,153,0.1))',
              border: '1px solid rgba(124,58,237,0.3)',
            }}
          >
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)', filter: 'blur(30px)' }}
            />
            <div className="flex items-center gap-2 mb-2 relative">
              <span className="text-xl">🏗️</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--purple-light)' }}>아키텍처 요약</h3>
            </div>
            <p className="text-sm leading-relaxed relative" style={{ color: 'var(--text)' }}>
              {result.architecture_summary}
            </p>
          </div>

          {/* 핵심 클래스 */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔑</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t.onboarding.topClasses}</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {result.top_classes.map((cls, i) => {
                const badge = LAYER_BADGE[cls.layer] ?? { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: 'var(--border)' }
                return (
                  <div key={cls.name} className="flex gap-3 items-start">
                    <span
                      className="w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--mint)', border: '1px solid rgba(52,211,153,0.3)' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold font-mono text-xs" style={{ color: 'var(--text)' }}>{cls.name}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                        >
                          {cls.layer}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {cls.why_important}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 온보딩 체크리스트 */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>온보딩 체크리스트</h3>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{completedCount}/{checklist.length}</span>
            </div>
            {/* 진행 바 */}
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${checklist.length ? (completedCount / checklist.length) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, var(--purple), var(--mint))',
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {checklist.map((item, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="mt-0.5 shrink-0"
                    style={{ accentColor: 'var(--mint)' }}
                  />
                  <span
                    className="text-xs leading-relaxed transition-colors"
                    style={{ color: checked[i] ? 'var(--text-muted)' : 'var(--text)', textDecoration: checked[i] ? 'line-through' : 'none' }}
                  >
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 핵심 개념 */}
          {result.key_concepts.length > 0 && (
            <div className="glass-card md:col-span-2 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📖</span>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t.onboarding.keyConcepts}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.key_concepts.map(concept => (
                  <div
                    key={concept.term}
                    className="flex gap-2 rounded-xl px-3 py-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                  >
                    <span className="font-mono text-xs font-bold shrink-0 min-w-[80px]" style={{ color: 'var(--purple-light)' }}>
                      {concept.term}
                    </span>
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {concept.definition}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  if (loading && prefilledUrl) {
    return (
      <div
        className="glass-card rounded-2xl p-12 flex flex-col items-center gap-4"
      >
        <div
          className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--purple) transparent var(--mint) transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t.onboarding.analyzing}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t.onboarding.title}</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{t.onboarding.subtitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="aurora-input w-full px-4 py-3 rounded-xl text-sm"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="aurora-btn w-full py-3 rounded-xl font-semibold text-sm"
          >
            {loading ? t.onboarding.analyzing : t.onboarding.analyze}
          </button>
        </form>
        {error && (
          <div
            className="mt-4 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
