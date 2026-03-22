import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import {
  getToken, changePasswordApi, updateProfileApi, getHistoryApi, getHistoryDetailApi,
  type UserInfo, type HistoryItem, type HistoryDetail,
} from '../lib/auth'
import type { OnboardingResult } from '../lib/api'
import { OnboardingResult as OnboardingResultView } from './OnboardingGuide'

type MyPageTab = 'profile' | 'history'

interface Props {
  user: UserInfo
  onClose: () => void
  onLogout: () => void
  onUserUpdate: (user: UserInfo) => void
}

export default function MyPage({ user, onClose, onLogout, onUserUpdate }: Props) {
  const { t } = useLang()
  const mp = t.myPage

  const [activeTab, setActiveTab] = useState<MyPageTab>('profile')

  const [profileName, setProfileName] = useState(user.name ?? '')
  const [profileBirthDate, setProfileBirthDate] = useState(user.birth_date ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<HistoryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (activeTab !== 'history') return
    setHistoryLoading(true)
    const token = getToken()
    if (!token) return
    getHistoryApi(token)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [activeTab])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    const token = getToken()
    if (!token) return
    setSavingProfile(true)
    try {
      const updated = await updateProfileApi(token, profileName.trim() || null, profileBirthDate || null)
      onUserUpdate(updated)
      setProfileMsg({ type: 'success', text: mp.profileSaved })
    } catch {
      setProfileMsg({ type: 'error', text: mp.errors.unknown })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: mp.passwordMismatch }); return }
    const token = getToken()
    if (!token) return
    setSavingPw(true)
    try {
      await changePasswordApi(token, currentPw, newPw)
      setPwMsg({ type: 'success', text: mp.passwordChanged })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (err) {
      const msg = String(err)
      if (msg.includes('올바르지 않습니다') || msg.includes('incorrect')) {
        setPwMsg({ type: 'error', text: mp.errors.currentPasswordWrong })
      } else {
        setPwMsg({ type: 'error', text: mp.errors.unknown })
      }
    } finally {
      setSavingPw(false)
    }
  }

  const toggleDetail = async (item: HistoryItem) => {
    if (expandedId === item.id) { setExpandedId(null); setDetail(null); return }
    setExpandedId(item.id)
    setDetail(null)
    setDetailLoading(true)
    const token = getToken()
    if (!token) return
    try {
      const d = await getHistoryDetailApi(token, item.id)
      setDetail(d)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  const inputClass = "aurora-input w-full px-3 py-2 text-sm rounded-lg"

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* 헤더 */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--text)' }}>{mp.title}</span>
          <button
            onClick={onClose}
            className="text-lg transition-colors hover:opacity-100"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['profile', 'history'] as MyPageTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-medium transition-colors relative"
              style={{ color: activeTab === tab ? 'var(--purple-light)' : 'var(--text-muted)' }}
            >
              {tab === 'profile' ? mp.tabProfile : mp.tabHistory}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--purple-light)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">

          {/* ── 프로필 수정 탭 ── */}
          {activeTab === 'profile' && (
            <>
              {/* 계정 정보 */}
              <section>
                <h3
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {mp.accountInfo}
                </h3>
                <div
                  className="rounded-xl p-4 flex flex-col gap-2 text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{t.auth.email}</span>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{mp.joinedAt}</span>
                    <span style={{ color: 'var(--text)' }}>{joinedDate}</span>
                  </div>
                </div>
              </section>

              {/* 기본 정보 수정 */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  {mp.editProfile}
                </h3>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t.auth.name}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t.auth.birthDate}</label>
                    <input
                      type="date"
                      value={profileBirthDate}
                      onChange={e => setProfileBirthDate(e.target.value)}
                      className={inputClass}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  {profileMsg && (
                    <p
                      className="text-xs px-3 py-2 rounded-lg"
                      style={
                        profileMsg.type === 'success'
                          ? { background: 'rgba(52,211,153,0.1)', color: 'var(--mint)', border: '1px solid rgba(52,211,153,0.3)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
                      }
                    >
                      {profileMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="aurora-btn py-2 rounded-lg text-sm font-medium w-full"
                  >
                    {savingProfile ? mp.savingProfile : mp.saveProfile}
                  </button>
                </form>
              </section>

              {/* 비밀번호 변경 */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  {mp.changePassword}
                </h3>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                  <input
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder={mp.currentPasswordPlaceholder}
                    required
                    className={inputClass}
                  />
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder={mp.newPasswordPlaceholder}
                    required
                    className={inputClass}
                  />
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder={mp.confirmPasswordPlaceholder}
                    required
                    className="aurora-input w-full px-3 py-2 text-sm rounded-lg"
                    style={confirmPw && confirmPw !== newPw ? { borderColor: 'rgba(239,68,68,0.5)' } : {}}
                  />
                  {pwMsg && (
                    <p
                      className="text-xs px-3 py-2 rounded-lg"
                      style={
                        pwMsg.type === 'success'
                          ? { background: 'rgba(52,211,153,0.1)', color: 'var(--mint)', border: '1px solid rgba(52,211,153,0.3)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
                      }
                    >
                      {pwMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingPw}
                    className="py-2 rounded-lg text-sm font-medium w-full transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: '1px solid var(--border-bright)' }}
                  >
                    {savingPw ? mp.saving : mp.savePassword}
                  </button>
                </form>
              </section>

              {/* 로그아웃 */}
              <button
                onClick={() => { onLogout(); onClose() }}
                className="w-full py-2 text-sm rounded-lg transition-all hover:opacity-80"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', background: 'rgba(239,68,68,0.05)' }}
              >
                {t.auth.logout}
              </button>
            </>
          )}

          {/* ── 분석 이력 탭 ── */}
          {activeTab === 'history' && (
            <>
              {historyLoading && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{mp.historyLoading}</p>
              )}
              {!historyLoading && history.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>{mp.historyEmpty}</p>
              )}
              {!historyLoading && history.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => toggleDetail(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={
                        item.type === 'code'
                          ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }
                          : item.type === 'onboarding'
                          ? { background: 'rgba(124,58,237,0.15)', color: 'var(--purple-light)', border: '1px solid rgba(124,58,237,0.3)' }
                          : { background: 'rgba(52,211,153,0.15)', color: 'var(--mint)', border: '1px solid rgba(52,211,153,0.3)' }
                      }
                    >
                      {item.type === 'code' ? mp.historyCode : item.type === 'onboarding' ? '🤖 Onboarding' : mp.historyProject}
                    </span>
                    <span className="text-sm font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{item.target_name}</span>
                    {item.tech_stack && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{item.tech_stack}</span>
                    )}
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('en-US')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{expandedId === item.id ? '▲' : '▼'}</span>
                  </button>

                  {expandedId === item.id && (
                    <div
                      className="px-4 py-4 text-xs"
                      style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                    >
                      {detailLoading && <p>Loading...</p>}
                      {!detailLoading && detail && item.type === 'code' && (
                        <CodeDetail result={detail.result} />
                      )}
                      {!detailLoading && detail && item.type === 'onboarding' && (
                        <OnboardingDetail result={detail.result} repoName={item.target_name} />
                      )}
                      {!detailLoading && detail && item.type === 'project' && (
                        <ProjectDetail result={detail.result} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CodeDetail({ result }: { result: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-2">
      <div><span className="font-semibold" style={{ color: 'var(--text)' }}>Language:</span> {String(result.language ?? '-')}</div>
      <div>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>Summary:</span>
        <p className="mt-1 leading-relaxed">{String(result.summary ?? '-')}</p>
      </div>
      {Array.isArray(result.patterns) && result.patterns.length > 0 && (
        <div>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Key Patterns:</span>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            {(result.patterns as string[]).slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
      {Array.isArray(result.recommendations) && (
        <div>{(result.recommendations as unknown[]).length} recommendations</div>
      )}
    </div>
  )
}

function ProjectDetail({ result }: { result: Record<string, unknown> }) {
  const stats = result.stats as { class_count: number; edge_count: number } | undefined
  const frameworks = result.frameworks as string[] | undefined
  return (
    <div className="flex flex-col gap-2">
      {frameworks && frameworks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Framework:</span>
          {frameworks.map(fw => (
            <span
              key={fw}
              className="px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--purple-light)', border: '1px solid rgba(124,58,237,0.3)' }}
            >
              {fw}
            </span>
          ))}
        </div>
      )}
      {stats && (
        <div className="flex gap-4">
          <div><span className="font-semibold" style={{ color: 'var(--text)' }}>Classes:</span> {stats.class_count}</div>
          <div><span className="font-semibold" style={{ color: 'var(--text)' }}>Calls:</span> {stats.edge_count}</div>
        </div>
      )}
    </div>
  )
}

function OnboardingDetail({ result, repoName }: { result: Record<string, unknown>; repoName: string }) {
  const onboarding = result as unknown as OnboardingResult
  return (
    <OnboardingResultView
      result={onboarding}
      repoUrl={repoName}
      onReset={() => {}}
    />
  )
}
