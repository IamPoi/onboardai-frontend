import { useState, useEffect, useCallback } from 'react'
import { registerApi, loginApi, saveToken, verifyEmailApi, resendOtpApi } from '../lib/auth'
import { useLang } from '../contexts/LangContext'

type Tab = 'login' | 'register'
type Step = 'form' | 'otp'

interface Props {
  onClose: () => void
  onSuccess: (token: string, email: string) => void
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const { t } = useLang()
  const [tab, setTab] = useState<Tab>('login')
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // 재발송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(v => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

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
      if (tab === 'login') {
        const token = await loginApi(email.trim(), password)
        saveToken(token)
        onSuccess(token, email.trim())
      } else {
        const res = await registerApi(email.trim(), password, name.trim(), birthDate || undefined)
        if (!res.needs_verification && res.access_token) {
          // 이메일 인증 미설정 환경 — 바로 로그인
          saveToken(res.access_token)
          onSuccess(res.access_token, email.trim())
        } else {
          setPendingEmail(res.email)
          setStep('otp')
          setResendCooldown(60)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('이미 사용 중인') || msg.includes('already')) {
        setError(t.auth.errors.duplicateEmail)
      } else if (msg.includes('올바르지 않습니다') || msg.includes('incorrect') || msg.includes('401')) {
        setError(t.auth.errors.invalidCredentials)
      } else if (msg.includes('인증이 필요')) {
        // 미인증 유저가 로그인 시도 — OTP 스텝으로 이동
        setPendingEmail(email.trim())
        setStep('otp')
        setResendCooldown(60)
        await resendOtpApi(email.trim()).catch(() => {})
      } else {
        setError(msg || t.auth.errors.unknown)
      }
    } finally {
      setLoading(false)
    }
  }, [tab, email, password, confirmPassword, name, birthDate, t, onSuccess])

  const handleVerifyOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('6자리 코드를 입력해주세요.'); return }
    setError('')
    setLoading(true)
    try {
      const token = await verifyEmailApi(pendingEmail, otp)
      saveToken(token)
      onSuccess(token, pendingEmail)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || '인증 실패. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [otp, pendingEmail, onSuccess])

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    try {
      await resendOtpApi(pendingEmail)
      setResendCooldown(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '재발송 실패')
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next); setStep('form'); setError('')
    setEmail(''); setPassword(''); setConfirmPassword(''); setName(''); setBirthDate(''); setOtp('')
  }

  // ── OTP 인증 스텝 ──────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📧</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">이메일 인증</h2>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{pendingEmail}</span>으로<br />
                발송된 6자리 코드를 입력해주세요.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                disabled={loading}
                className="px-4 py-4 rounded-xl border border-gray-200 text-center text-2xl font-bold
                           tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent disabled:opacity-50 bg-gray-50"
              />

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold
                           hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '인증 중...' : '인증 완료'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1 mt-4">
              <span className="text-xs text-slate-400">코드를 받지 못했나요?</span>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-xs text-emerald-600 font-medium hover:underline disabled:text-slate-300 disabled:no-underline"
              >
                {resendCooldown > 0 ? `재발송 (${resendCooldown}s)` : '재발송'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 로그인/회원가입 폼 ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
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
                                 ? 'border-red-300' : 'border-gray-200'
                             }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500">{t.auth.errors.passwordMismatch}</p>
                )}
              </div>
            )}

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
