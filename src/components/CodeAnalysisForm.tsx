import { useRef, useState } from 'react'
import { useLang } from '../contexts/LangContext'

// 허용 확장자 (파서 지원 + 코드 파일)
const ALLOWED_EXTS = new Set([
  '.java', '.py', '.ts', '.tsx', '.js', '.jsx',
  '.go', '.rs', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.rb', '.php', '.kt', '.swift', '.scala', '.lua',
  '.r', '.sql', '.sh', '.bash', '.html', '.css',
  '.vue', '.svelte', '.ex', '.exs', '.hs', '.dart',
])

// 거부할 확장자 (압축 / 바이너리)
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
    // 폴더 감지
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
        {/* 코드 텍스트 입력 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            {t.codeAnalysis.textLabel}
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t.codeAnalysis.textPlaceholder}
            disabled={loading}
            rows={10}
            className="px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed resize-y"
          />
        </div>

        {/* 파일 첨부 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            {t.codeAnalysis.fileLabel}
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg px-4 py-6
                       text-center text-sm text-slate-400 hover:border-emerald-400
                       hover:text-emerald-500 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-slate-700">
                <span className="font-mono text-xs bg-white border border-slate-200 px-2 py-1 rounded">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeFile() }}
                  className="text-slate-400 hover:text-red-500 transition-colors text-base leading-none"
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
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ {fileWarning}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (!text.trim() && !file)}
          className="py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium
                     hover:bg-emerald-600 active:bg-emerald-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {loading ? t.codeAnalysis.analyzing : t.codeAnalysis.submit}
        </button>
      </div>
    </form>
  )
}
