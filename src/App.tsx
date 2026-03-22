import { useState, useCallback, useEffect, useRef } from 'react'
import RepoForm from './components/RepoForm'
import StatusBanner from './components/StatusBanner'
import FlowGraph from './components/FlowGraph'
import AuthModal from './components/AuthModal'
import TabBar, { type TabKey } from './components/TabBar'
import CodeAnalysisForm from './components/CodeAnalysisForm'
import CodeAnalysisResult from './components/CodeAnalysisResult'
import OnboardingGuide from './components/OnboardingGuide'
import PaymentModal from './components/PaymentModal'
import MyPage from './components/MyPage'
import AdBanner from './components/AdBanner'
import IssuePanel from './components/IssuePanel'
import { submitRepo, pollJob, analyzeCode, onboardingApi, type JobResponse, type GraphResult, type CodeAnalysisResult as CodeAnalysisData, type OnboardingResult } from './lib/api'
import { getToken, meApi, clearToken, type UserInfo } from './lib/auth'
import { downloadPdf } from './lib/pdf'
import { useLang } from './contexts/LangContext'

type ResultSection = 'graph' | 'issues' | 'guide'

type AppState =
  | { phase: 'idle' }
  | { phase: 'loading'; jobId: string; status: JobResponse['status'] }
  | { phase: 'done'; graph: GraphResult; stats: { class_count: number; edge_count: number }; repoUrl: string }
  | { phase: 'error'; message: string }

const FW_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  spring:  { bg: 'rgba(52,211,153,0.1)',  text: '#34d399', border: 'rgba(52,211,153,0.3)' },
  nestjs:  { bg: 'rgba(244,114,182,0.1)', text: '#f472b6', border: 'rgba(244,114,182,0.3)' },
  django:  { bg: 'rgba(52,211,153,0.1)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.25)' },
  fastapi: { bg: 'rgba(96,165,250,0.1)',  text: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
}

const LEGEND_LAYERS = [
  { key: 'controller' as const, bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  color: '#93c5fd' },
  { key: 'service'    as const, bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)',  color: '#6ee7b7' },
  { key: 'repository' as const, bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.3)',  color: '#fcd34d' },
]

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' })
  const { t, lang } = useLang()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('project')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activeSection, setActiveSection] = useState<ResultSection>('graph')
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  type InlineOnboarding =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'done'; result: OnboardingResult }
    | { phase: 'error'; message: string }
  const [inlineOnboarding, setInlineOnboarding] = useState<InlineOnboarding>({ phase: 'idle' })

  type CodeState =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'done'; result: CodeAnalysisData }
    | { phase: 'error'; message: string }
  const [codeState, setCodeState] = useState<CodeState>({ phase: 'idle' })

  const handleCodeSubmit = useCallback(async (text: string, file: File | null) => {
    setCodeState({ phase: 'loading' })
    try {
      const token = getToken() ?? undefined
      const result = await analyzeCode(text, file, lang, token)
      setCodeState({ phase: 'done', result })
    } catch (err) {
      setCodeState({ phase: 'error', message: String(err) })
    }
  }, [lang])

  const resetCode = () => setCodeState({ phase: 'idle' })

  useEffect(() => {
    const token = getToken()
    if (!token) return
    meApi(token).then(setUser).catch(() => clearToken())
  }, [])

  const handleAuthSuccess = (token: string, email: string) => {
    setShowAuth(false)
    meApi(token)
      .then(setUser)
      .catch(() => setUser({ id: 0, email, name: null, birth_date: null, created_at: '' }))
  }

  const handleLogout = () => { clearToken(); setUser(null) }

  const handleOnboardingCTA = useCallback(async () => {
    if (state.phase !== 'done') return
    setInlineOnboarding({ phase: 'loading' })
    try {
      const result = await onboardingApi(state.repoUrl, lang)
      setInlineOnboarding({ phase: 'done', result })
    } catch (err) {
      setInlineOnboarding({ phase: 'error', message: String(err) })
    }
  }, [state, lang])

  const handleSubmit = useCallback(async (url: string) => {
    setInlineOnboarding({ phase: 'idle' })
    const trySubmit = async (isRetry = false): Promise<void> => {
      try {
        const token = getToken() ?? undefined
        const jobId = await submitRepo(url, token)
        setState({ phase: 'loading', jobId, status: 'pending' })
        const cancel = pollJob(jobId, (job: JobResponse) => {
          if (job.status === 'complete' && job.result) {
            cancel()
            setState({ phase: 'done', graph: job.result, stats: job.result.stats, repoUrl: url })
          } else if (job.status === 'failed') {
            cancel()
            setState({ phase: 'error', message: job.error ?? t.errors.unknown })
          } else {
            setState(prev => prev.phase === 'loading' ? { ...prev, status: job.status } : prev)
          }
        })
      } catch (err) {
        const isNetworkError = err instanceof Error &&
          (err.message.includes('연결할 수 없습니다') || err.message.includes('초과됐습니다'))
        if (isNetworkError && !isRetry) {
          setState({ phase: 'loading', jobId: '', status: 'pending' })
          await new Promise(r => setTimeout(r, 5000))
          return trySubmit(true)
        }
        setState({ phase: 'error', message: String(err) })
      }
    }
    await trySubmit()
  }, [t])

  const reset = () => {
    setState({ phase: 'idle' })
    setInlineOnboarding({ phase: 'idle' })
    setActiveSection('graph')
  }

  const loading = state.phase === 'loading'
  const frameworks = state.phase === 'done' ? (state.graph.frameworks ?? []) : []

  const getLayerLabel = (layer: 'controller' | 'service' | 'repository'): string => {
    if (frameworks.length === 0) return t.legend[layer]
    const labels = Array.from(new Set(
      frameworks.map(fw => t.layerNames[fw]?.[layer] ?? t.legend[layer])
    ))
    return labels.join(' / ')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>

      {/* Aurora orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(90px)', opacity: 0.3, top: -250, left: -150 }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #34d399, transparent 70%)', filter: 'blur(80px)', opacity: 0.18, top: 80, right: -120 }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(80px)', opacity: 0.12, bottom: 200, right: 250 }} />
      </div>

      {/* Modals */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
      {showMyPage && user && <MyPage user={user} onClose={() => setShowMyPage(false)} onLogout={handleLogout} onUserUpdate={setUser} />}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onConfirm={() => { setShowPaymentModal(false); handleOnboardingCTA() }}
        />
      )}

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(5,5,16,0.85)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #34d399)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', flexShrink: 0,
          }}>✦</div>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.5px' }}>OnboardAI</span>
          <span style={{
            fontSize: '0.62rem', fontWeight: 600,
            color: 'var(--purple-light)',
            background: 'var(--purple-glow)',
            padding: '2px 8px', borderRadius: 100,
            border: '1px solid rgba(124,58,237,0.3)',
          }}>beta</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px', borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c3aed, #34d399)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.7rem',
                }}>
                  {(user.name ?? user.email)[0].toUpperCase()}
                </span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name ?? user.email}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{showUserMenu ? '▲' : '▼'}</span>
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  width: 180, borderRadius: 12, overflow: 'hidden',
                  background: 'rgba(13,13,31,0.95)', border: '1px solid var(--border-bright)',
                  backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setShowMyPage(true); setShowUserMenu(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    ⚙️ {t.myPage.title}
                  </button>
                  <button
                    onClick={() => { handleLogout(); setShowUserMenu(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '0.8rem', color: '#f87171', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    → {t.auth.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="aurora-btn"
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: '0.82rem' }}
            >
              {t.auth.login}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1,
        padding: activeTab === 'project' && state.phase === 'done' ? '24px 24px' : '48px 24px',
        gap: 24, alignItems: activeTab === 'project' && state.phase === 'done' ? 'stretch' : 'center',
      }}>

        {/* Hero */}
        {!(activeTab === 'project' && state.phase === 'done') && (
          <div style={{ textAlign: 'center', maxWidth: 560, alignSelf: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 100,
              background: 'var(--mint-glow)', border: '1px solid rgba(52,211,153,0.2)',
              color: 'var(--mint)', fontSize: '0.72rem', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, background: 'var(--mint)', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
              AI-Powered Code Onboarding
            </div>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 16, color: 'var(--text)' }}>
              {t.title}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.75 }}>{t.subtitle}</p>
          </div>
        )}

        {/* TabBar */}
        {!(activeTab === 'project' && state.phase === 'done') && (
          <div style={{ alignSelf: 'center' }}>
            <TabBar active={activeTab} onChange={setActiveTab} />
          </div>
        )}

        {/* 프로젝트 분석 입력 */}
        {activeTab === 'project' && state.phase !== 'done' && (
          <div style={{ alignSelf: 'center', width: '100%', maxWidth: 560 }}>
            <RepoForm onSubmit={handleSubmit} loading={loading} />
          </div>
        )}

        {/* 코드 분석 폼 */}
        {activeTab === 'code' && (codeState.phase === 'idle' || codeState.phase === 'loading') && (
          <CodeAnalysisForm onSubmit={handleCodeSubmit} loading={codeState.phase === 'loading'} />
        )}

        {/* 코드 분석 광고 */}
        {activeTab === 'code' && (codeState.phase === 'done' || codeState.phase === 'error') && (
          <AdBanner slot="7183168015" format="horizontal" className="w-full max-w-2xl h-[90px]" />
        )}

        {/* 코드 분석 에러 */}
        {activeTab === 'code' && codeState.phase === 'error' && (
          <>
            <StatusBanner status="failed" error={codeState.message} />
            <button
              onClick={resetCode}
              style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {t.app.reset}
            </button>
          </>
        )}

        {/* 코드 분석 결과 */}
        {activeTab === 'code' && codeState.phase === 'done' && (
          <CodeAnalysisResult result={codeState.result} onReset={resetCode} />
        )}

        {/* 프로젝트 분석 Status */}
        {activeTab === 'project' && state.phase === 'loading' && (
          <div style={{ alignSelf: 'center', width: '100%', maxWidth: 560 }}>
            <StatusBanner status={state.status} />
          </div>
        )}
        {activeTab === 'project' && state.phase === 'error' && (
          <div style={{ alignSelf: 'center', width: '100%', maxWidth: 560 }}>
            <StatusBanner status="failed" error={state.message} />
          </div>
        )}
        {activeTab === 'project' && state.phase === 'done' && (
          <div style={{ alignSelf: 'center', width: '100%', maxWidth: 560 }}>
            <StatusBanner status="complete" stats={state.stats} />
          </div>
        )}

        {/* Reset */}
        {activeTab === 'project' && (state.phase === 'done' || state.phase === 'error') && (
          <button
            onClick={reset}
            style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t.app.reset}
          </button>
        )}

        {/* 프로젝트 분석 결과 — 사이드바 레이아웃 */}
        {activeTab === 'project' && state.phase === 'done' && (
          <div style={{ width: '100%', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* 사이드바 */}
            <aside style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* 프레임워크 뱃지 */}
              {frameworks.length > 0 && (
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Framework</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {frameworks.map(fw => {
                      const s = FW_COLORS[fw] ?? { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)', border: 'var(--border)' }
                      return (
                        <span key={fw} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 100, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                          {t.frameworks[fw as keyof typeof t.frameworks] ?? fw}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 네비게이션 */}
              {([
                { key: 'graph'  as const, icon: '◆', label: 'Architecture Graph' },
                { key: 'issues' as const, icon: '◎', label: 'Code Issues', badge: state.graph.issues?.length },
                { key: 'guide'  as const, icon: '✦', label: 'AI Onboarding Guide' },
              ] as const).map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                    background: activeSection === item.key ? 'linear-gradient(135deg, #7c3aed, #34d399)' : 'var(--surface)',
                    color: activeSection === item.key ? 'white' : 'var(--text-muted)',
                    boxShadow: activeSection === item.key ? '0 4px 15px rgba(124,58,237,0.3)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                  {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                      padding: '1px 7px', borderRadius: 100,
                      background: activeSection === item.key ? 'rgba(255,255,255,0.2)' : 'rgba(248,113,113,0.15)',
                      color: activeSection === item.key ? 'white' : '#f87171',
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* PDF — 온보딩 가이드 완료 후에만 표시 */}
              {inlineOnboarding.phase === 'done' && (
                <button
                  onClick={() => downloadPdf(state.repoUrl, state.graph, inlineOnboarding.result)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 500,
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                    color: 'var(--mint)', marginTop: 4,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.1)')}
                >
                  <span style={{ flexShrink: 0 }}>↓</span>
                  <span>Export PDF</span>
                </button>
              )}

              {/* Legend */}
              <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', marginTop: 4 }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Legend</span>
                {LEGEND_LAYERS.map(({ key, bg, border, color }) => (
                  <span key={key} style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: bg, border: `1px solid ${border}`, color, marginBottom: 4 }}>
                    {getLayerLabel(key)}
                  </span>
                ))}
              </div>
            </aside>

            {/* 컨텐츠 */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {activeSection === 'graph' && (
                <div style={{
                  borderRadius: 16, overflow: 'hidden', height: '75vh', minHeight: 500,
                  border: '1px solid var(--border)', background: 'rgba(5,5,16,0.8)',
                }}>
                  <FlowGraph graph={state.graph} />
                </div>
              )}

              {activeSection === 'issues' && (
                <IssuePanel
                  issues={state.graph.issues ?? []}
                  isPaid={false}
                  onUpgrade={() => setShowPaymentModal(true)}
                />
              )}

              {activeSection === 'guide' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {inlineOnboarding.phase === 'idle' && (
                    <div style={{
                      borderRadius: 20, border: '1px solid var(--border-bright)',
                      background: 'var(--surface)', padding: '48px 24px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                      backdropFilter: 'blur(20px)',
                    }}>
                      <span style={{ fontSize: '2.5rem' }}>✦</span>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>AI Onboarding Guide</p>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Automatically generate an onboarding guide for new developers</p>
                      </div>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="aurora-btn"
                        style={{ padding: '12px 32px', borderRadius: 12, fontSize: '0.9rem' }}
                      >
                        Generate Onboarding Guide →
                      </button>
                    </div>
                  )}

                  {inlineOnboarding.phase === 'loading' && (
                    <div style={{
                      borderRadius: 20, border: '1px solid var(--border)',
                      background: 'var(--surface)', padding: '64px 24px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: '3px solid transparent',
                        borderTopColor: 'var(--purple)',
                        borderRightColor: 'var(--mint)',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generating onboarding guide... (up to 60s)</p>
                    </div>
                  )}

                  {inlineOnboarding.phase === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: '100%', padding: '14px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.85rem' }}>
                        {inlineOnboarding.message}
                      </div>
                      <button onClick={handleOnboardingCTA} style={{ fontSize: '0.82rem', color: 'var(--mint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Retry
                      </button>
                    </div>
                  )}

                  {inlineOnboarding.phase === 'done' && (
                    <>
                      <OnboardingGuide lang={lang} preloadedResult={inlineOnboarding.result} />
                      <AdBanner slot="7183168015" format="rectangle" className="w-full h-[250px]" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'rgba(5,5,16,0.6)',
        backdropFilter: 'blur(20px)',
        padding: '32px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>OnboardAI</span>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Made by <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Makelab</strong></p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 6, height: 6, background: 'var(--mint)', borderRadius: '50%', animation: 'pulse 2s infinite', display: 'inline-block' }} />
            All systems operational
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>© 2026 OnboardAI</span>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
