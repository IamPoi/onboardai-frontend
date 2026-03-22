import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { onboardingApi, createPaymentIntent, verifyPayment, type OnboardingResult } from '../lib/api'
import { getToken } from '../lib/auth'
import { useLang } from '../contexts/LangContext'
import { downloadPdf } from '../lib/pdf'

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ''
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null

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

// ── Stripe 결제 폼 ────────────────────────────────────────────────────────────
function StripeCheckoutForm({
  repoUrl, lang, onSuccess, onCancel,
}: {
  repoUrl: string
  lang: string
  onSuccess: (result: OnboardingResult) => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      })

      if (stripeError) {
        setError(stripeError.message ?? '결제에 실패했습니다.')
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        const token = getToken()
        if (token) await verifyPayment(paymentIntent.id, token)

        // 결제 완료 → 온보딩 가이드 생성
        const result = await onboardingApi(repoUrl, lang, token ?? undefined)
        onSuccess(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-4">
      <div
        className="p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
      >
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <p
          className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="aurora-btn py-3 rounded-xl font-bold text-sm w-full"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            처리 중...
          </span>
        ) : '$5 결제하고 온보딩 가이드 생성'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        취소
      </button>
    </form>
  )
}

// ── 풍부한 온보딩 가이드 결과 ───────────────────────────────────────────────────
function OnboardingResult({ result, repoUrl, onReset }: {
  result: OnboardingResult
  repoUrl: string
  onReset: () => void
}) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const modules = result.core_modules ?? result.top_classes ?? []
  const checklist = result.onboarding_checklist ?? (result.onboarding_tip ? result.onboarding_tip.split('\n').filter(Boolean) : [])
  const completedCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadPdf(repoUrl, { nodes: [], edges: [], stats: { class_count: 0, edge_count: 0 }, frameworks: [] }, result)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--mint)', border: '1px solid rgba(52,211,153,0.3)' }}
          >
            📄 PDF 다운로드
          </button>
          <button
            onClick={onReset}
            className="text-xs transition-colors hover:opacity-100"
            style={{ color: 'var(--text-muted)' }}
          >
            초기화
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 프로젝트 개요 — 전폭 */}
        {result.project_overview && (
          <div
            className="md:col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(52,211,153,0.1))', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)', filter: 'blur(30px)' }} />
            <div className="flex items-center gap-2 mb-3 relative">
              <span className="text-xl">🏗️</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--purple-light)' }}>프로젝트 개요</h3>
            </div>
            <p className="text-sm leading-relaxed mb-3 relative" style={{ color: 'var(--text)' }}>
              {result.project_overview.summary}
            </p>
            {result.project_overview.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-2 relative">
                {result.project_overview.tech_stack.map(t => (
                  <div
                    key={t.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    title={t.purpose}
                  >
                    <span className="font-semibold" style={{ color: 'var(--purple-light)' }}>{t.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>— {t.purpose}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 아키텍처 요약 — project_overview 없을 때만 단독 표시 */}
        {!result.project_overview && (
          <div
            className="md:col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(52,211,153,0.1))', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🏗️</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--purple-light)' }}>아키텍처 요약</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{result.architecture_summary}</p>
          </div>
        )}

        {/* 아키텍처 요약 (project_overview와 함께 있을 때) */}
        {result.project_overview && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔭</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>아키텍처 요약</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{result.architecture_summary}</p>
          </div>
        )}

        {/* Getting Started */}
        {result.getting_started && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🚀</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>시작하기</h3>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {result.getting_started.overview}
            </p>
            <div className="flex flex-col gap-2">
              {result.getting_started.steps.map(s => (
                <div key={s.step} className="flex gap-3 items-start">
                  <span
                    className="w-5 h-5 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--mint)', border: '1px solid rgba(52,211,153,0.3)' }}
                  >
                    {s.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{s.title}</p>
                    {s.command && (
                      <code
                        className="text-[10px] px-2 py-0.5 rounded font-mono block mb-1"
                        style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--mint)', border: '1px solid var(--border)' }}
                      >
                        {s.command}
                      </code>
                    )}
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 핵심 모듈 */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔑</span>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>핵심 모듈</h3>
          </div>
          <div className="flex flex-col gap-3">
            {modules.slice(0, 6).map((cls, i) => {
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
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="font-bold font-mono text-xs" style={{ color: 'var(--text)' }}>{cls.name}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                      >
                        {cls.layer}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-0.5" style={{ color: 'var(--text-muted)' }}>{cls.role}</p>
                    <p className="text-xs" style={{ color: 'rgba(167,139,250,0.8)' }}>{cls.why_important}</p>
                    {'key_methods' in cls && (cls as { key_methods?: string[] }).key_methods?.length ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {((cls as { key_methods?: string[] }).key_methods ?? []).slice(0, 3).map(m => (
                          <span key={m} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{m}</span>
                        ))}
                      </div>
                    ) : null}
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
              <label key={i} className="flex items-start gap-2.5 cursor-pointer">
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

        {/* Feature Walkthrough — 전폭 */}
        {result.feature_walkthrough && (
          <div
            className="md:col-span-2 rounded-2xl p-5"
            style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔄</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--mint)' }}>
                기능 흐름: {result.feature_walkthrough.feature_name}
              </h3>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {result.feature_walkthrough.description}
            </p>
            <div className="flex flex-col gap-1.5">
              {result.feature_walkthrough.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                  <span className="shrink-0 w-4 h-4 rounded-full bg-mint/20 flex items-center justify-center text-[9px] font-bold mt-0.5"
                    style={{ background: 'rgba(52,211,153,0.2)', color: 'var(--mint)' }}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 핵심 개념 */}
        {result.key_concepts.length > 0 && (
          <div className="glass-card md:col-span-2 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📖</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>핵심 용어 사전</h3>
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

        {/* 첫 기여 제안 */}
        {result.first_contribution && (
          <div
            className="md:col-span-2 rounded-2xl p-5"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌱</span>
              <h3 className="text-sm font-bold" style={{ color: 'var(--purple-light)' }}>
                첫 기여 제안: {result.first_contribution.title}
              </h3>
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
              {result.first_contribution.description}
            </p>
            {result.first_contribution.relevant_files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.first_contribution.relevant_files.map(f => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded font-mono"
                    style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--purple-light)', border: '1px solid rgba(124,58,237,0.3)' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function OnboardingGuide({ lang, prefilledUrl, preloadedResult }: Props) {
  const { t } = useLang()
  const [url, setUrl] = useState(prefilledUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OnboardingResult | null>(preloadedResult ?? null)
  const [error, setError] = useState<string | null>(null)
  const [paymentStep, setPaymentStep] = useState<'idle' | 'checkout'>('idle')
  const [clientSecret, setClientSecret] = useState('')

  const reset = () => { setResult(null); setError(null); setUrl(''); setPaymentStep('idle'); setClientSecret('') }

  const handleRequestGuide = async () => {
    const token = getToken()
    if (!token) {
      setError('온보딩 가이드 생성은 로그인이 필요합니다.')
      return
    }
    if (!url.trim()) return
    setError(null)

    // Stripe 키가 없으면 결제 없이 바로 생성 (테스트/개발 환경)
    if (!STRIPE_KEY) {
      setLoading(true)
      try {
        const r = await onboardingApi(url.trim(), lang, token)
        setResult(r)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
      return
    }

    // Stripe 결제 플로우
    try {
      const intent = await createPaymentIntent(url.trim(), token)
      setClientSecret(intent.client_secret)
      setPaymentStep('checkout')
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 초기화 실패')
    }
  }

  // 결과 화면
  if (result) {
    return <OnboardingResult result={result} repoUrl={url || prefilledUrl || ''} onReset={reset} />
  }

  // Stripe 결제 화면
  if (paymentStep === 'checkout' && clientSecret && stripePromise) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'linear-gradient(135deg, var(--purple), var(--mint))', color: 'white' }}
              >
                $5
              </span>
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>온보딩 가이드 결제</h2>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              결제 후 AI가 풍부한 온보딩 가이드를 자동 생성합니다.
            </p>
          </div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: { colorPrimary: '#7c3aed', colorBackground: '#0d0d1f', colorText: '#e8e8f0' },
              },
            }}
          >
            <StripeCheckoutForm
              repoUrl={url}
              lang={lang}
              onSuccess={(r) => { setResult(r); setPaymentStep('idle') }}
              onCancel={() => setPaymentStep('idle')}
            />
          </Elements>
        </div>
      </div>
    )
  }

  // 로딩 (결제 없이 직접 생성 중)
  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-12 flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--purple) transparent var(--mint) transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI가 온보딩 가이드를 생성 중입니다...</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>60~90초 소요될 수 있습니다.</p>
      </div>
    )
  }

  // 입력 화면
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t.onboarding.title}</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{t.onboarding.subtitle}</p>
        </div>

        {/* 포함 내용 미리보기 */}
        <div
          className="rounded-xl p-4 mb-5 text-xs"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
        >
          <p className="font-semibold mb-2" style={{ color: 'var(--purple-light)' }}>가이드에 포함되는 내용:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              '🏗️ 프로젝트 개요 & 기술 스택',
              '🚀 로컬 환경 시작 가이드',
              '🔑 핵심 모듈 상세 분석',
              '🔄 주요 기능 흐름 설명',
              '📋 온보딩 체크리스트',
              '📖 핵심 용어 사전',
              '🌱 첫 기여 제안',
              '📄 PDF 내보내기',
            ].map(item => (
              <div key={item} className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="aurora-input w-full px-4 py-3 rounded-xl text-sm"
          />
          <button
            onClick={handleRequestGuide}
            disabled={!url.trim()}
            className="aurora-btn w-full py-3.5 rounded-xl font-bold text-sm"
          >
            {STRIPE_KEY ? '온보딩 가이드 생성 ($5)' : '온보딩 가이드 생성 (무료 체험)'}
          </button>
        </div>

        {error && (
          <div
            className="mt-4 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {error}
          </div>
        )}

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          {STRIPE_KEY ? '🔒 Stripe 보안 결제 · 결제 후 즉시 가이드 생성' : '🔒 결제 시스템 준비 중 — 현재 무료 체험'}
        </p>
      </div>
    </div>
  )
}
