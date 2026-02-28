import { useState, useCallback } from 'react'
import RepoForm from './components/RepoForm'
import StatusBanner from './components/StatusBanner'
import FlowGraph from './components/FlowGraph'
import { submitRepo, pollJob, type JobResponse, type GraphResult } from './lib/api'
import { useLang } from './contexts/LangContext'

type AppState =
  | { phase: 'idle' }
  | { phase: 'loading'; jobId: string; status: JobResponse['status'] }
  | { phase: 'done'; graph: GraphResult; stats: { class_count: number; edge_count: number } }
  | { phase: 'error'; message: string }

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' })
  const { t, lang, setLang } = useLang()

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900 tracking-tight">CodeLens</span>
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
            {t.header.mvp}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* 언어 셀렉트박스 */}
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'ko' | 'en')}
            className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-600
                       focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
          >
            <option value="ko">{t.lang.ko}</option>
            <option value="en">{t.lang.en}</option>
          </select>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-400 rounded-full inline-block" />
            {t.header.analyzer}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-2 text-sm">{t.subtitle}</p>
        </div>

        {/* Form */}
        <RepoForm onSubmit={handleSubmit} loading={loading} />

        {/* Status */}
        {state.phase === 'loading' && (
          <StatusBanner status={state.status} />
        )}
        {state.phase === 'error' && (
          <StatusBanner status="failed" error={state.message} />
        )}
        {state.phase === 'done' && (
          <StatusBanner status="complete" stats={state.stats} />
        )}

        {/* Reset button */}
        {(state.phase === 'done' || state.phase === 'error') && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            {t.app.reset}
          </button>
        )}

        {/* Legend */}
        {state.phase === 'done' && (
          <div className="flex gap-4 text-xs">
            {[
              { key: 'controller' as const, bg: '#dbeafe', border: '#3b82f6', color: '#1e40af' },
              { key: 'service'    as const, bg: '#dcfce7', border: '#22c55e', color: '#15803d' },
              { key: 'repository' as const, bg: '#ffedd5', border: '#f97316', color: '#9a3412' },
            ].map(({ key, bg, border, color }) => (
              <span
                key={key}
                className="px-2.5 py-1 rounded-md font-medium"
                style={{ background: bg, border: `1px solid ${border}`, color }}
              >
                {t.legend[key]}
              </span>
            ))}
          </div>
        )}

        {/* Graph */}
        {state.phase === 'done' && (
          <div style={{ width: '100%', height: '80vh', minHeight: '600px' }}>
            <FlowGraph graph={state.graph} />
          </div>
        )}
      </main>
    </div>
  )
}
