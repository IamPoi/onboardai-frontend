import { useState } from 'react'
import { onboardingApi, type OnboardingResult } from '../lib/api'
import { useLang } from '../contexts/LangContext'

const LAYER_BADGE: Record<string, string> = {
  controller: 'bg-blue-100 text-blue-700 border-blue-200',
  service:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  repository: 'bg-orange-100 text-orange-700 border-orange-200',
  view:       'bg-blue-100 text-blue-700 border-blue-200',
  model:      'bg-orange-100 text-orange-700 border-orange-200',
  router:     'bg-blue-100 text-blue-700 border-blue-200',
}

interface Props {
  lang: 'ko' | 'en'
  prefilledUrl?: string | null
  preloadedResult?: OnboardingResult | null
}

function parseChecklist(tip: string): string[] {
  // 줄바꿈 또는 번호/불릿으로 분리
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
            <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded-full font-semibold">Premium</span>
            <span className="text-sm font-semibold text-slate-700">AI 온보딩 가이드</span>
          </div>
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">초기화</button>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 아키텍처 요약 — 전폭 */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏗️</span>
              <h3 className="text-sm font-bold text-slate-200">아키텍처 요약</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{result.architecture_summary}</p>
          </div>

          {/* 핵심 클래스 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔑</span>
              <h3 className="text-sm font-bold text-slate-800">{t.onboarding.topClasses}</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {result.top_classes.map((cls, i) => (
                <div key={cls.name} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 font-mono text-xs">{cls.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${LAYER_BADGE[cls.layer] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {cls.layer}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{cls.why_important}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 온보딩 체크리스트 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="text-sm font-bold text-slate-800">온보딩 체크리스트</h3>
              </div>
              <span className="text-xs text-slate-400">{completedCount}/{checklist.length}</span>
            </div>
            {/* 진행 바 */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${checklist.length ? (completedCount / checklist.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {checklist.map((item, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="mt-0.5 accent-emerald-500 shrink-0"
                  />
                  <span className={`text-xs leading-relaxed transition-colors ${
                    checked[i] ? 'line-through text-slate-300' : 'text-slate-600 group-hover:text-slate-800'
                  }`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 핵심 개념 */}
          {result.key_concepts.length > 0 && (
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📖</span>
                <h3 className="text-sm font-bold text-slate-800">{t.onboarding.keyConcepts}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.key_concepts.map(concept => (
                  <div key={concept.term} className="flex gap-2 bg-slate-50 rounded-xl px-3 py-2">
                    <span className="font-mono text-xs font-bold text-slate-800 shrink-0 min-w-[80px]">{concept.term}</span>
                    <span className="text-xs text-slate-500 leading-relaxed">{concept.definition}</span>
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
      <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">{t.onboarding.analyzing}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-xl font-bold text-slate-900">{t.onboarding.title}</h2>
          <p className="text-sm text-slate-500 mt-2">{t.onboarding.subtitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200
                       text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? t.onboarding.analyzing : t.onboarding.analyze}
          </button>
        </form>
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
        )}
      </div>
    </div>
  )
}
