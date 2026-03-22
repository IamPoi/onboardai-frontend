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

// Framework badge colors
const FW_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  spring:  { bg: '#dcfce7', text: '#15803d', border: '#22c55e' },
  nestjs:  { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
  django:  { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  fastapi: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
}

// Layer legend colors (always the same 3)
const LEGEND_LAYERS = [
  { key: 'controller' as const, bg: '#dbeafe', border: '#3b82f6', color: '#1e40af' },
  { key: 'service'    as const, bg: '#dcfce7', border: '#22c55e', color: '#15803d' },
  { key: 'repository' as const, bg: '#ffedd5', border: '#f97316', color: '#9a3412' },
]

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' })
  const { t, lang, setLang } = useLang()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [showMyPage, setShowMyPage] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('project')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [activeSection, setActiveSection] = useState<ResultSection>('graph')
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 유저 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 프로젝트 탭 인라인 온보딩 상태
  type InlineOnboarding =
    | { phase: 'idle' }
    | { phase: 'loading' }
    | { phase: 'done'; result: OnboardingResult }
    | { phase: 'error'; message: string }
  const [inlineOnboarding, setInlineOnboarding] = useState<InlineOnboarding>({ phase: 'idle' })

  // 코드 분석 상태
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

  // 페이지 로드 시 저장된 토큰으로 유저 정보 복원
  useEffect(() => {
    const token = getToken()
    if (!token) return
    meApi(token)
      .then(setUser)
      .catch(() => clearToken())
  }, [])

  const handleAuthSuccess = (token: string, email: string) => {
    setShowAuth(false)
    meApi(token)
      .then(setUser)
      .catch(() => setUser({ id: 0, email, name: null, birth_date: null, created_at: '' }))
  }

  const handleLogout = () => {
    clearToken()
    setUser(null)
  }

  // 인라인 온보딩 CTA 핸들러 — 탭 전환 없이 바로 가이드 생성
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
            setState(prev =>
              prev.phase === 'loading' ? { ...prev, status: job.status } : prev
            )
          }
        })
      } catch (err) {
        // 네트워크 오류이고 첫 시도이면 5초 후 자동 재시도
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

  // Compute per-framework layer labels for the legend
  const frameworks = state.phase === 'done' ? (state.graph.frameworks ?? []) : []
  const getLayerLabel = (layer: 'controller' | 'service' | 'repository'): string => {
    if (frameworks.length === 0) return t.legend[layer]
    // Collect unique labels across detected frameworks
    const labels = Array.from(new Set(
      frameworks.map(fw => t.layerNames[fw]?.[layer] ?? t.legend[layer])
    ))
    return labels.join(' / ')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{
      backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}>
      {/* Auth 모달 */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* 마이페이지 모달 */}
      {showMyPage && user && (
        <MyPage
          user={user}
          onClose={() => setShowMyPage(false)}
          onLogout={handleLogout}
          onUserUpdate={setUser}
        />
      )}

      {/* 결제 유도 모달 */}
      {showPaymentModal && (
        <PaymentModal
          onClose={() => setShowPaymentModal(false)}
          onConfirm={() => {
            setShowPaymentModal(false)
            handleOnboardingCTA()
          }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white tracking-tight">OnboardAI</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-md font-medium border border-emerald-500/25">
            beta
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'ko' | 'en')}
            className="text-xs px-2 py-1.5 rounded-md border border-slate-700 bg-slate-800 text-slate-400
                       focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ko">{t.lang.ko}</option>
            <option value="en">{t.lang.en}</option>
          </select>

          {/* 로그인/유저 영역 */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              {/* 유저 버튼 */}
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700
                           text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all text-xs"
              >
                <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(user.name ?? user.email)[0].toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{user.name ?? user.email}</span>
                <span className="text-slate-500 text-[10px]">{showUserMenu ? '▲' : '▼'}</span>
              </button>

              {/* 드롭다운 */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setShowMyPage(true); setShowUserMenu(false) }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span> {t.myPage.title}
                  </button>
                  <button
                    onClick={() => { handleLogout(); setShowUserMenu(false) }}
                    className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-slate-700"
                  >
                    <span>→</span> {t.auth.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-md font-medium
                         hover:bg-emerald-600 transition-colors"
            >
              {t.auth.login}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className={`flex-1 flex flex-col px-6 py-12 gap-6 ${activeTab === 'project' && state.phase === 'done' ? 'items-stretch max-w-none' : 'items-center'}`}>

        {/* Hero */}
        <div className="text-center max-w-xl self-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            AI-powered Code Onboarding
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
          <p className="text-slate-500 mt-3 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        {/* 탭 */}
        <div className="self-center">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>

        {/* 프로젝트 분석 탭 */}
        {activeTab === 'project' && state.phase !== 'done' && (
          <div className="self-center w-full max-w-xl">
            <RepoForm onSubmit={handleSubmit} loading={loading} />
          </div>
        )}

        {/* 코드 분석 탭 */}
        {activeTab === 'code' && codeState.phase === 'idle' && (
          <CodeAnalysisForm onSubmit={handleCodeSubmit} loading={false} />
        )}
        {activeTab === 'code' && codeState.phase === 'loading' && (
          <CodeAnalysisForm onSubmit={handleCodeSubmit} loading={true} />
        )}

        {/* 광고 — 코드 분석 결과 상단 */}
        {activeTab === 'code' && (codeState.phase === 'done' || codeState.phase === 'error') && (
          <AdBanner slot="7183168015" format="horizontal" className="w-full max-w-2xl h-[90px]" />
        )}

        {/* 코드 분석 결과 */}
        {activeTab === 'code' && codeState.phase === 'error' && (
          <>
            <StatusBanner status="failed" error={codeState.message} />
            <button onClick={resetCode} className="text-sm text-gray-500 underline hover:text-gray-700">
              {t.app.reset}
            </button>
          </>
        )}
        {activeTab === 'code' && codeState.phase === 'done' && (
          <CodeAnalysisResult result={codeState.result} onReset={resetCode} />
        )}

        {/* 프로젝트 분석 Status */}
        {activeTab === 'project' && state.phase === 'loading' && (
          <div className="self-center w-full max-w-xl"><StatusBanner status={state.status} /></div>
        )}
        {activeTab === 'project' && state.phase === 'error' && (
          <div className="self-center w-full max-w-xl"><StatusBanner status="failed" error={state.message} /></div>
        )}
        {activeTab === 'project' && state.phase === 'done' && (
          <div className="self-center w-full max-w-xl"><StatusBanner status="complete" stats={state.stats} /></div>
        )}

        {/* Reset button */}
        {activeTab === 'project' && (state.phase === 'done' || state.phase === 'error') && (
          <button
            onClick={reset}
            className="self-center text-sm text-gray-500 underline hover:text-gray-700"
          >
            {t.app.reset}
          </button>
        )}

        {/* 프로젝트 분석 결과 — 사이드바 레이아웃 */}
        {activeTab === 'project' && state.phase === 'done' && (
          <div className="w-full flex flex-col lg:flex-row gap-4">

            {/* 왼쪽 사이드바 */}
            <aside className="lg:w-52 shrink-0 flex lg:flex-col flex-row gap-2 lg:gap-1">
              {/* 감지된 프레임워크 */}
              {frameworks.length > 0 && (
                <div className="hidden lg:flex flex-col gap-1.5 px-3 py-2.5 mb-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Framework</span>
                  <div className="flex flex-wrap gap-1.5">
                    {frameworks.map(fw => {
                      const style = FW_STYLE[fw] ?? { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' }
                      return (
                        <span
                          key={fw}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                        >
                          {t.frameworks[fw as keyof typeof t.frameworks] ?? fw}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 네비게이션 버튼 */}
              {(
                [
                  { key: 'graph' as const,  icon: '🗺️', label: '아키텍처 그래프' },
                  { key: 'issues' as const, icon: '🔍', label: '코드 이슈', badge: state.graph.issues?.length },
                  { key: 'guide' as const,  icon: '🚀', label: 'AI 온보딩 가이드' },
                ] as const
              ).map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                    ${activeSection === item.key
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0
                      ${activeSection === item.key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* PDF 다운로드 버튼 */}
              <button
                onClick={() => downloadPdf(
                  state.repoUrl,
                  state.graph,
                  inlineOnboarding.phase === 'done' ? inlineOnboarding.result : null,
                )}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
                           bg-white text-slate-600 border border-slate-200 hover:border-emerald-300
                           hover:text-emerald-700 transition-all mt-2"
              >
                <span className="text-base shrink-0">📄</span>
                <span className="truncate">PDF 내보내기</span>
              </button>

              {/* 레이어 범례 — 사이드바 하단 (lg 이상) */}
              <div className="hidden lg:flex flex-col gap-1.5 px-3 py-2.5 mt-2 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Legend</span>
                {LEGEND_LAYERS.map(({ key, bg, border, color }) => (
                  <span
                    key={key}
                    className="text-xs px-2 py-0.5 rounded-md font-medium w-fit"
                    style={{ background: bg, border: `1px solid ${border}`, color }}
                  >
                    {getLayerLabel(key)}
                  </span>
                ))}
              </div>
            </aside>

            {/* 오른쪽 컨텐츠 */}
            <div className="flex-1 min-w-0">

              {/* 그래프 섹션 */}
              {activeSection === 'graph' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '75vh', minHeight: '500px' }}>
                  <FlowGraph graph={state.graph} />
                </div>
              )}

              {/* 코드 이슈 섹션 */}
              {activeSection === 'issues' && (
                <IssuePanel
                  issues={state.graph.issues ?? []}
                  isPaid={false}
                  onUpgrade={() => setShowPaymentModal(true)}
                />
              )}

              {/* AI 가이드 섹션 */}
              {activeSection === 'guide' && (
                <div className="flex flex-col gap-4">
                  {inlineOnboarding.phase === 'idle' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center gap-4">
                      <span className="text-4xl">🚀</span>
                      <div className="text-center">
                        <p className="text-slate-700 font-semibold mb-1">AI 온보딩 가이드</p>
                        <p className="text-xs text-slate-400">신규 개발자를 위한 AI 온보딩 가이드를 자동으로 생성합니다</p>
                      </div>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                                   font-semibold rounded-xl shadow-sm hover:shadow-md hover:scale-105
                                   transition-all text-sm flex items-center gap-2"
                      >
                        <span>온보딩 가이드 생성하기</span>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Premium</span>
                      </button>
                    </div>
                  )}

                  {inlineOnboarding.phase === 'loading' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500">온보딩 가이드 생성 중... (최대 60초 소요)</p>
                    </div>
                  )}

                  {inlineOnboarding.phase === 'error' && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-full p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                        {inlineOnboarding.message}
                      </div>
                      <button onClick={handleOnboardingCTA} className="text-sm text-emerald-600 underline hover:text-emerald-700">
                        다시 시도
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
      <footer className="border-t border-slate-200 bg-white/70 backdrop-blur mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

            {/* 로고 */}
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-slate-800 text-sm">OnboardAI</span>
              <p className="text-xs text-slate-400">Made by <span className="font-medium text-slate-500">Makelab</span></p>
            </div>

            {/* 링크 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Links</span>
              <div className="flex flex-col gap-1.5">
                <a href="https://onboardai.makelab.kr" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">
                  onboardai.makelab.kr
                </a>
              </div>
            </div>

            {/* 상태 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-500">All systems operational</span>
              </div>
            </div>
          </div>

          {/* 하단 */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-slate-400">© 2026 OnboardAI. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-300">이용약관</span>
              <span className="text-xs text-slate-300">개인정보처리방침</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
