import { useState } from 'react'
import { useLang } from '../contexts/LangContext'

interface Props {
  onSubmit: (url: string) => void
  loading: boolean
}

async function checkRepoPublic(repoUrl: string): Promise<'public' | 'private' | 'unknown'> {
  try {
    const trimmed = repoUrl.trim().replace(/\/$/, '')

    // GitHub
    const ghMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)/)
    if (ghMatch) {
      const res = await fetch(`https://api.github.com/repos/${ghMatch[1]}/${ghMatch[2]}`, {
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (res.status === 404) return 'private'
      if (res.ok) {
        const data = await res.json()
        return data.private ? 'private' : 'public'
      }
      return 'unknown'
    }

    // GitLab
    const glMatch = trimmed.match(/^https:\/\/gitlab\.com\/([^/]+)\/([^/]+)/)
    if (glMatch) {
      const encoded = encodeURIComponent(`${glMatch[1]}/${glMatch[2]}`)
      const res = await fetch(`https://gitlab.com/api/v4/projects/${encoded}`)
      if (res.status === 404) return 'private'
      if (res.ok) {
        const data = await res.json()
        return data.visibility === 'public' ? 'public' : 'private'
      }
      return 'unknown'
    }
  } catch {
    // 네트워크 오류 등 — 차단하지 않고 통과
  }
  return 'unknown'
}

export default function RepoForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const { t } = useLang()

  function validate(value: string): string {
    if (!value.trim()) return t.form.errors.emptyUrl
    if (!/^https:\/\/(github|gitlab)\.com\/.+\/.+/.test(value.trim())) {
      return t.form.errors.invalidUrl
    }
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(url)
    if (err) { setError(err); return }
    setError('')

    setChecking(true)
    const visibility = await checkRepoPublic(url)
    setChecking(false)

    if (visibility === 'private') {
      setError('🔒 Private repository. Only public repositories can be analyzed.')
      return
    }

    onSubmit(url.trim())
  }

  const isDisabled = loading || checking

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-2xl">
      <div
        className="glass-card rounded-xl p-4 flex flex-col gap-3"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder={t.form.placeholder}
            disabled={isDisabled}
            className="aurora-input flex-1 px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isDisabled}
            className="aurora-btn px-5 py-2.5 rounded-lg text-sm whitespace-nowrap"
          >
            {checking ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : loading ? t.form.analyzing : t.form.submit}
          </button>
        </div>

        {error && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: error.startsWith('🔒') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${error.startsWith('🔒') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: error.startsWith('🔒') ? '#fbbf24' : '#f87171',
            }}
          >
            {error}
          </p>
        )}

        <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <span>ℹ️</span>
          Only <strong className="font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Public</strong> GitHub / GitLab repositories can be analyzed.
        </p>
      </div>
    </form>
  )
}
