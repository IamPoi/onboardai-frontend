import { useState, useCallback, useEffect } from 'react'
import RepoForm from './components/RepoForm'
import StatusBanner from './components/StatusBanner'
import FlowGraph from './components/FlowGraph'
import AuthModal from './components/AuthModal'
import TabBar, { type TabKey } from './components/TabBar'
import CodeAnalysisForm from './components/CodeAnalysisForm'
import CodeAnalysisResult from './components/CodeAnalysisResult'
import OnboardingGuide from './components/OnboardingGuide'
import { submitRepo, pollJob, analyzeCode, type JobResponse, type GraphResult, type CodeAnalysisResult as CodeAnalysisData } from './lib/api'
import { getToken, meApi, clearToken, type UserInfo } from './lib/auth'
import { useLang } from './contexts/LangContext'

type AppState =
  | { phase: 'idle' }
  | { phase: 'loading'; jobId: string; status: JobResponse['status'] }
  | { phase: 'done'; graph: GraphResult; stats: { class_count: number; edge_count: number } }
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
  const [activeTab, setActiveTab] = useState<TabKey>('project')

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
      const result = await analyzeCode(text, file, lang)
      setCodeState({ phase: 'done', result })
    } catch (err) {
      setCodeState({ phase: 'error', message: String(err) })
    }
  }, [])

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
      .catch(() => setUser({ id: 0, email, created_at: '' }))
  }

  const handleLogout = () => {
    clearToken()
    setUser(null)
  }

  const handleSubmit = useCallback(async (url: string) => {
    try {
      const jobId = await submitRepo(url)
      setState({ phase: 'loading', jobId, status: 'pending' })

      const cancel = pollJob(jobId, (job: JobResponse) => {
        if (job.status === 'complete' && job.result) {
          cancel()
          setState({ phase: 'done', graph: job.result, stats: job.result.stats })
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
      setState({ phase: 'error', message: String(err) })
    }
  }, [t])

  const reset = () => setState({ phase: 'idle' })

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Auth 모달 */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Header */}
      <header className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white tracking-tight">OnboardAI</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium border border-emerald-500/30">
            {t.header.mvp}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'ko' | 'en')}
            className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-300
                       focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ko">{t.lang.ko}</option>
            <option value="en">{t.lang.en}</option>
          </select>

          {/* 로그인/유저 영역 */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 max-w-[140px] truncate">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1 rounded-lg border border-slate-600 text-slate-300
                           hover:bg-slate-800 transition-colors"
              >
                {t.auth.logout}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-medium
                         hover:bg-emerald-600 transition-colors"
            >
              {t.auth.login}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-slate-500 mt-2 text-sm">{t.subtitle}</p>
        </div>

        {/* 탭 */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* 프로젝트 분석 탭 */}
        {activeTab === 'project' && (
          <RepoForm onSubmit={handleSubmit} loading={loading} />
        )}

        {/* 코드 분석 탭 */}
        {activeTab === 'code' && codeState.phase === 'idle' && (
          <CodeAnalysisForm onSubmit={handleCodeSubmit} loading={false} />
        )}
        {activeTab === 'code' && codeState.phase === 'loading' && (
          <CodeAnalysisForm onSubmit={handleCodeSubmit} loading={true} />
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
          <StatusBanner status={state.status} />
        )}
        {activeTab === 'project' && state.phase === 'error' && (
          <StatusBanner status="failed" error={state.message} />
        )}
        {activeTab === 'project' && state.phase === 'done' && (
          <StatusBanner status="complete" stats={state.stats} />
        )}

        {/* Reset button */}
        {activeTab === 'project' && (state.phase === 'done' || state.phase === 'error') && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            {t.app.reset}
          </button>
        )}

        {/* Framework badges + Legend */}
        {activeTab === 'project' && state.phase === 'done' && (
          <div className="flex flex-col items-center gap-3">
            {/* Detected frameworks */}
            {frameworks.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t.frameworks.detected}:</span>
                {frameworks.map(fw => {
                  const style = FW_STYLE[fw] ?? { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' }
                  return (
                    <span
                      key={fw}
                      className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                    >
                      {t.frameworks[fw as keyof typeof t.frameworks] ?? fw}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Layer legend */}
            <div className="flex gap-3 text-xs">
              {LEGEND_LAYERS.map(({ key, bg, border, color }) => (
                <span
                  key={key}
                  className="px-2.5 py-1 rounded-md font-medium"
                  style={{ background: bg, border: `1px solid ${border}`, color }}
                >
                  {getLayerLabel(key)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Graph */}
        {activeTab === 'project' && state.phase === 'done' && (
          <div style={{ width: '100%', height: '80vh', minHeight: '600px' }}>
            <FlowGraph graph={state.graph} />
          </div>
        )}

        {/* 온보딩 가이드 탭 */}
        {activeTab === 'onboarding' && (
          <OnboardingGuide lang={lang} />
        )}
      </main>
    </div>
  )
}
