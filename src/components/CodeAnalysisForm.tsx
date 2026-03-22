import { useRef, useState } from 'react'
import { useLang } from '../contexts/LangContext'

const ALLOWED_EXTS = new Set([
  '.java', '.py', '.ts', '.tsx', '.js', '.jsx',
  '.go', '.rs', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.rb', '.php', '.kt', '.swift', '.scala', '.lua',
  '.r', '.sql', '.sh', '.bash', '.html', '.css',
  '.vue', '.svelte', '.ex', '.exs', '.hs', '.dart',
])

const BLOCKED_EXTS = new Set([
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.jar', '.war', '.apk', '.ipa', '.exe', '.dll',
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.mp4',
])

interface Props {
  onSubmit: (text: string, file: File | null) => void
  loading: boolean
}

export default function CodeAnalysisForm({ onSubmit, loading }: Props) {
  const { t } = useLang()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileWarning, setFileWarning] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const validateFile = (f: File): string => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (BLOCKED_EXTS.has(ext)) return t.codeAnalysis.errors.blockedFile
    if (!ALLOWED_EXTS.has(ext)) return t.codeAnalysis.errors.unknownFile
    if (f.size > 200 * 1024) return t.codeAnalysis.errors.fileTooLarge
    return ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const warning = validateFile(f)
    setFileWarning(warning)
    if (!warning) setFile(f)
    else { setFile(null); e.target.value = '' }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const item = e.dataTransfer.items?.[0]
    if (item?.webkitGetAsEntry?.()?.isDirectory) {
      setFileWarning(t.codeAnalysis.errors.folderNotAllowed)
      setFile(null)
      return
    }
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    const warning = validateFile(f)
    setFileWarning(warning)
    if (!warning) setFile(f)
    else setFile(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !file) return
    onSubmit(text.trim(), file)
  }

  const removeFile = () => {
    setFile(null)
    setFileWarning('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl flex flex-col gap-3">
      <div className="glass-card rounded-xl p-4 flex flex-col gap-4">
        {/* 코드 텍스트 입력 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {t.codeAnalysis.textLabel}
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t.codeAnalysis.textPlaceholder}
            disabled={loading}
            rows={10}
            className="aurora-input w-full px-4 py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-y"
          />
        </div>

        {/* 파일 첨부 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {t.codeAnalysis.fileLabel}
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="rounded-lg px-4 py-6 text-center text-sm cursor-pointer transition-all"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '2px dashed var(--border-bright)',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--mint)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--mint)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-bright)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--text-muted)' }}
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text)' }}>
                <span
                  className="font-mono text-xs px-2 py-1 rounded"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--mint)' }}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeFile() }}
                  className="text-base leading-none transition-colors hover:text-red-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ×
                </button>
              </div>
            ) : (
              t.codeAnalysis.filePlaceholder
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />
          {fileWarning && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
            >
              ⚠ {fileWarning}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!text.trim() && !file)}
          className="aurora-btn py-2.5 rounded-lg text-sm font-medium w-full"
        >
          {loading ? t.codeAnalysis.analyzing : t.codeAnalysis.submit}
        </button>
      </div>
    </form>
  )
}
