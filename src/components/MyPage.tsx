import { useState } from 'react'
import { useLang } from '../contexts/LangContext'
import { getToken, changePasswordApi, type UserInfo } from '../lib/auth'

interface Props {
  user: UserInfo
  onClose: () => void
  onLogout: () => void
}

export default function MyPage({ user, onClose, onLogout }: Props) {
  const { t } = useLang()
  const mp = t.myPage

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    if (newPw !== confirmPw) {
      setErrorMsg(mp.passwordMismatch)
      return
    }

    const token = getToken()
    if (!token) return

    setSaving(true)
    try {
      await changePasswordApi(token, currentPw, newPw)
      setSuccessMsg(mp.passwordChanged)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      const msg = String(err)
      if (msg.includes('올바르지 않습니다') || msg.includes('incorrect')) {
        setErrorMsg(mp.errors.currentPasswordWrong)
      } else {
        setErrorMsg(mp.errors.unknown)
      }
    } finally {
      setSaving(false)
    }
  }

  // 가입일 포맷
  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  return (
    /* 오버레이 배경 */
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* 헤더 */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <span className="text-white font-semibold">{mp.title}</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">

          {/* 계정 정보 섹션 */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {mp.accountInfo}
            </h3>
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t.auth.email}</span>
                <span className="text-slate-900 font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{mp.joinedAt}</span>
                <span className="text-slate-900">{joinedDate}</span>
              </div>
            </div>
          </section>

          {/* 비밀번호 변경 섹션 */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {mp.changePassword}
            </h3>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder={mp.currentPasswordPlaceholder}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder={mp.newPasswordPlaceholder}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder={mp.confirmPasswordPlaceholder}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />

              {errorMsg && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{successMsg}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300
                           text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? mp.saving : mp.savePassword}
              </button>
            </form>
          </section>

          {/* 로그아웃 */}
          <button
            onClick={() => { onLogout(); onClose() }}
            className="w-full py-2 border border-slate-200 text-slate-500 hover:text-slate-700
                       hover:bg-slate-50 text-sm rounded-lg transition-colors"
          >
            {t.auth.logout}
          </button>

        </div>
      </div>
    </div>
  )
}
