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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError(t.auth.errors.emailRequired); return }
    if (!password) { setError(t.auth.errors.passwordRequired); return }
    if (password.length < 8) { setError(t.auth.errors.passwordTooShort); return }

    if (tab === 'register') {
      if (!name.trim()) { setError(t.auth.errors.nameRequired); return }
      if (password !== confirmPassword) { setError(t.auth.errors.passwordMismatch); return }
    }

    setLoading(true)
    try {
      const token = tab === 'login'
        ? await loginApi(email.trim(), password)
        : await registerApi(email.trim(), password, name.trim(), birthDate || undefined)
      saveToken(token)
      onSuccess(token, email.trim())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
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
  }, [tab, email, password, confirmPassword, name, birthDate, t, onSuccess])

  const switchTab = (next: Tab) => {
    setTab(next)
    setError('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setName('')
    setBirthDate('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 탭 헤더 */}
        <div className="flex border-b border-gray-200">
          {(['login', 'register'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => switchTab(tabKey)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === tabKey
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tabKey === 'login' ? t.auth.login : t.auth.register}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            {/* 회원가입 전용: 이름 */}
            {tab === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{t.auth.name} <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder={t.auth.namePlaceholder}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                             disabled:opacity-50 bg-gray-50"
                />
              </div>
            )}

            {/* 이메일 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">{t.auth.email} <span className="text-red-400">*</span></label>
              <input
                type="email"
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                           disabled:opacity-50 bg-gray-50"
              />
            </div>

            {/* 회원가입 전용: 생년월일 */}
            {tab === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{t.auth.birthDate}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  disabled={loading}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                             disabled:opacity-50 bg-gray-50"
                />
              </div>
            )}

            {/* 비밀번호 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">{t.auth.password} <span className="text-red-400">*</span></label>
              <input
                type="password"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                placeholder={t.auth.passwordPlaceholder}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                           disabled:opacity-50 bg-gray-50"
              />
            </div>

            {/* 회원가입 전용: 비밀번호 확인 */}
            {tab === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{t.auth.confirmPassword} <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.auth.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={`px-3 py-2.5 rounded-xl border text-sm
                             focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                             disabled:opacity-50 bg-gray-50 ${
                               confirmPassword && confirmPassword !== password
                                 ? 'border-red-300'
                                 : 'border-gray-200'
                             }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500">{t.auth.errors.passwordMismatch}</p>
                )}
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold
                         hover:bg-emerald-600 active:bg-emerald-700
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? (tab === 'login' ? t.auth.loggingIn : t.auth.registering)
                : (tab === 'login' ? t.auth.login : t.auth.register)
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
