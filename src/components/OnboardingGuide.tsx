import { useState, useEffect } from 'react'
import { onboardingApi, type OnboardingResult } from '../lib/api'
import { useLang } from '../contexts/LangContext'

const LAYER_BADGE: Record<string, string> = {
  controller: 'bg-blue-100 text-blue-700',
  service:    'bg-emerald-100 text-emerald-700',
  repository: 'bg-orange-100 text-orange-700',
  view:       'bg-blue-100 text-blue-700',
  model:      'bg-orange-100 text-orange-700',
  router:     'bg-blue-100 text-blue-700',
}

interface Props {
  lang: 'ko' | 'en'
  prefilledUrl?: string | null
}

export default function OnboardingGuide({ lang, prefilledUrl }: Props) {
  const { t } = useLang()
  const [url, setUrl] = useState(prefilledUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // prefilledUrl이 들어오면 자동으로 API 호출
  useEffect(() => {
    if (!prefilledUrl) return
    setUrl(prefilledUrl)
    setResult(null)
    setError(null)
    setLoading(true)
    onboardingApi(prefilledUrl, lang)
      .then(data => setResult(data))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [prefilledUrl, lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await onboardingApi(url.trim(), lang)
      setResult(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setError(null); setUrl('') }

  if (result) {
    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
        {/* Architecture Summary */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏗️</span>
            <h2 className="text-lg font-bold">{t.onboarding.architectureSummary}</h2>
          </div>
          <p className="text-slate-200 leading-relaxed text-sm">{result.architecture_summary}</p>
        </div>

        {/* Top Classes */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span>🔑</span> {t.onboarding.topClasses}
          </h2>
          <div className="flex flex-col gap-3">
            {result.top_classes.map((cls, i) => (
              <div key={cls.name} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-slate-900 font-mono text-sm">{cls.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LAYER_BADGE[cls.layer] ?? 'bg-slate-100 text-slate-600'}`}>
                      {cls.layer}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{cls.role}</p>
                  <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
                    💡 {cls.why_important}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Concepts */}
        {result.key_concepts.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span>📖</span> {t.onboarding.keyConcepts}
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-50">
              {result.key_concepts.map(concept => (
                <div key={concept.term} className="flex gap-3 px-5 py-3">
                  <span className="font-mono text-sm font-semibold text-slate-800 min-w-[120px]">{concept.term}</span>
                  <span className="text-sm text-slate-500">{concept.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        {result.onboarding_tip && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">{t.onboarding.tip}</p>
              <p className="text-sm text-amber-700">{result.onboarding_tip}</p>
            </div>
          </div>
        )}

        <button onClick={reset} className="text-sm text-slate-400 underline hover:text-slate-600 self-center">
          {t.app.reset}
        </button>
      </div>
    )
  }

  // prefilledUrl로 자동 제출 중일 때 스피너 표시
  if (loading && prefilledUrl) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">{t.onboarding.analyzing}</p>
          <p className="text-xs text-slate-400 font-mono truncate max-w-full">{prefilledUrl}</p>
        </div>
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
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
