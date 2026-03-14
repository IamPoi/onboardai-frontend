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
      setError('🔒 비공개(private) 저장소입니다. Public 저장소만 분석할 수 있습니다.')
      return
    }

    onSubmit(url.trim())
  }

  const isDisabled = loading || checking

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder={t.form.placeholder}
            disabled={isDisabled}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          />
          <button
            type="submit"
            disabled={isDisabled}
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium
                       hover:bg-emerald-600 active:bg-emerald-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors whitespace-nowrap"
          >
            {checking ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                확인 중...
              </span>
            ) : loading ? t.form.analyzing : t.form.submit}
          </button>
        </div>

        {error && (
          <p className={`text-xs ${error.startsWith('🔒') ? 'text-amber-600' : 'text-red-500'}`}>
            {error}
          </p>
        )}

        {/* public 안내 메모 */}
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <span>ℹ️</span>
          GitHub / GitLab <strong className="font-medium text-slate-500">Public</strong> 저장소만 분석 가능합니다.
        </p>
      </div>
    </form>
  )
}
