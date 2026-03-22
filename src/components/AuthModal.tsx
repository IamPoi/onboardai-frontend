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
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return }
    setError('')
    setLoading(true)
    try {
      const token = await verifyEmailApi(pendingEmail, otp)
      saveToken(token)
      onSuccess(token, pendingEmail)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Verification failed. Please try again.')
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
      setError(err instanceof Error ? err.message : 'Resend failed')
    }
  }

  const switchTab = (next: Tab) => {
    setTab(next); setStep('form'); setError('')
    setEmail(''); setPassword(''); setConfirmPassword(''); setName(''); setBirthDate(''); setOtp('')
  }

  const inputClass = "aurora-input w-full px-3 py-2.5 rounded-xl text-sm disabled:opacity-50"

  // ── OTP 인증 스텝 ──────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <div
          className="glass-card rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <span className="text-2xl">📧</span>
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Email Verification</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Enter the 6-digit code sent to<br />
                <span className="font-medium" style={{ color: 'var(--text)' }}>{pendingEmail}</span>
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
                className="aurora-input w-full px-4 py-4 rounded-xl text-center text-2xl font-bold tracking-[0.5em] font-mono disabled:opacity-50"
              />

              {error && (
                <p
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="aurora-btn py-3 rounded-xl text-sm font-semibold w-full"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1 mt-4">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Didn't receive the code?</span>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-xs font-medium hover:underline"
                style={{ color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--mint)' }}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 로그인/회원가입 폼 ──────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 탭 헤더 */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['login', 'register'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => switchTab(tabKey)}
              className="flex-1 py-4 text-sm font-semibold transition-colors relative"
              style={{
                color: tab === tabKey ? 'var(--mint)' : 'var(--text-muted)',
                background: tab === tabKey ? 'rgba(52,211,153,0.05)' : 'transparent',
              }}
            >
              {tabKey === 'login' ? t.auth.login : t.auth.register}
              {tab === tabKey && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--mint)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            {tab === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {t.auth.name} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder={t.auth.namePlaceholder}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {t.auth.email} <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            {tab === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t.auth.birthDate}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {t.auth.password} <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="password"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                placeholder={t.auth.passwordPlaceholder}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            {tab === 'register' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {t.auth.confirmPassword} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.auth.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="aurora-input w-full px-3 py-2.5 rounded-xl text-sm disabled:opacity-50"
                  style={
                    confirmPassword && confirmPassword !== password
                      ? { borderColor: 'rgba(239,68,68,0.5)' }
                      : {}
                  }
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs" style={{ color: '#f87171' }}>{t.auth.errors.passwordMismatch}</p>
                )}
              </div>
            )}

            {error && (
              <p
                className="text-xs px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="aurora-btn mt-1 py-3 rounded-xl text-sm font-semibold w-full"
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
