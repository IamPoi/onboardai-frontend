import type { JobStatus } from '../lib/api'
import { useLang } from '../contexts/LangContext'

interface Props {
  status: JobStatus
  error?: string
  stats?: { class_count: number; edge_count: number }
}

const COLOR: Record<JobStatus, string> = {
  pending:  'bg-yellow-50 border-yellow-300 text-yellow-800',
  running:  'bg-blue-50 border-blue-300 text-blue-800',
  complete: 'bg-green-50 border-green-300 text-green-800',
  failed:   'bg-red-50 border-red-300 text-red-800',
}

export default function StatusBanner({ status, error, stats }: Props) {
  const { t } = useLang()

  const MESSAGE: Record<JobStatus, string> = {
    pending:  t.status.pending,
    running:  t.status.running,
    complete: t.status.complete,
    failed:   t.status.failed,
  }

  function parseErrorMessage(raw?: string): string {
    if (!raw) return t.errors.unknown
    for (const [code, msg] of Object.entries(t.errors)) {
      if (code !== 'unknown' && raw.includes(code)) return msg as string
    }
    return raw
  }

  const displayError = parseErrorMessage(error)

  return (
    <div className={`w-full max-w-2xl px-4 py-3 rounded-lg border text-sm ${COLOR[status]}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {(status === 'pending' || status === 'running') && (
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {MESSAGE[status]}
        </span>
        {stats && (
          <span className="text-xs opacity-70">
            {t.status.statsClasses(stats.class_count)} · {t.status.statsEdges(stats.edge_count)}
          </span>
        )}
      </div>
      {status === 'failed' && error && (
        <p className="mt-1.5 text-xs opacity-80">{displayError}</p>
      )}
    </div>
  )
}
