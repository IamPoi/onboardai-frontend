import type { JobStatus } from '../lib/api'
import { useLang } from '../contexts/LangContext'

interface Props {
  status: JobStatus
  error?: string
  stats?: { class_count: number; edge_count: number }
}

const STATUS_STYLE: Record<JobStatus, { bg: string; border: string; color: string }> = {
  pending:  { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' },
  running:  { bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.3)', color: 'var(--purple-light)' },
  complete: { bg: 'rgba(52, 211, 153, 0.08)', border: 'rgba(52, 211, 153, 0.3)', color: 'var(--mint)' },
  failed:   { bg: 'rgba(239, 68, 68, 0.08)',  border: 'rgba(239, 68, 68, 0.3)',  color: '#f87171' },
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
  const style = STATUS_STYLE[status]

  return (
    <div
      className="w-full max-w-2xl px-4 py-3 rounded-lg text-sm"
      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          {(status === 'pending' || status === 'running') && (
            <span
              className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${style.color} transparent transparent transparent` }}
            />
          )}
          {MESSAGE[status]}
        </span>
        {stats && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
