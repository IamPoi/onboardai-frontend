import { useState, useEffect, useCallback } from 'react'
import { registerApi, loginApi, saveToken } from '../lib/auth'
import { useLang } from '../contexts/LangContext'

type Tab = 'login' | 'register'

interface Props {
  onClose: () => void
  onSuccess: (token: string, email: string) => void
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const { t } = useLang()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ESC 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 클라이언트 검증
    if (!email.trim()) { setError(t.auth.errors.emailRequired); return }
    if (!password) { setError(t.auth.errors.passwordRequired); return }
    if (tab === 'register' && password.length < 8) { setError(t.auth.errors.passwordTooShort); return }

    setLoading(true)
    try {
      const token = tab === 'login'
        ? await loginApi(email.trim(), password)
        : await registerApi(email.trim(), password)
      saveToken(token)
      onSuccess(token, email.trim())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // 백엔드 에러 메시지 번역
      if (msg.includes('이미 사용 중인') || msg.includes('already')) {
        setError(t.auth.errors.duplicateEmail)
      } else if (msg.includes('올바르지 않습니다') || msg.includes('incorrect') || msg.includes('401')) {
        setError(t.auth.errors.invalidCredentials)
      } else {
        setError(t.auth.errors.unknown)
      }
    } finally {
      setLoading(false)
    }
  }, [tab, email, password, t, onSuccess])

  const switchTab = (next: Tab) => {
    setTab(next)
    setError('')
    setEmail('')
    setPassword('')
  }

  return (
    /* 배경 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      {/* 모달 카드 */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8"
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="close"
        >
          ×
        </button>

        {/* 탭 */}
        <div className="flex mb-6 border-b border-gray-200">
          {(['login', 'register'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => switchTab(tabKey)}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                tab === tabKey
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tabKey === 'login' ? t.auth.login : t.auth.register}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">{t.auth.email}</label>
            <input
              type="email"
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600">{t.auth.password}</label>
            <input
              type="password"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              placeholder={t.auth.passwordPlaceholder}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
                       hover:bg-blue-700 active:bg-blue-800
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {loading
              ? (tab === 'login' ? t.auth.loggingIn : t.auth.registering)
              : (tab === 'login' ? t.auth.login : t.auth.register)
            }
          </button>
        </form>
      </div>
    </div>
  )
}
