import { useState } from 'react'
import { useLang } from '../contexts/LangContext'

interface Props {
  onSubmit: (url: string) => void
  loading: boolean
}

export default function RepoForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const { t } = useLang()

  function validate(value: string): string {
    if (!value.trim()) return t.form.errors.emptyUrl
    if (!/^https:\/\/(github|gitlab)\.com\/.+\/.+/.test(value.trim())) {
      return t.form.errors.invalidUrl
    }
    return ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(url)
    if (err) { setError(err); return }
    setError('')
    onSubmit(url.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-2xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={e => { setUrl(e.target.value); setError('') }}
          placeholder={t.form.placeholder}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                     hover:bg-blue-700 active:bg-blue-800
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors whitespace-nowrap"
        >
          {loading ? t.form.analyzing : t.form.submit}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </form>
  )
}
