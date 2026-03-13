import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import {
  getToken, changePasswordApi, updateProfileApi, getHistoryApi, getHistoryDetailApi,
  type UserInfo, type HistoryItem, type HistoryDetail,
} from '../lib/auth'

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

  // 프로필 수정 상태
  const [profileName, setProfileName] = useState(user.name ?? '')
  const [profileBirthDate, setProfileBirthDate] = useState(user.birth_date ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 비밀번호 변경 상태
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 분석 이력 상태
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<HistoryDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // 이력 탭 진입 시 로드
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

  // 프로필 저장
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

  // 비밀번호 변경
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

  // 이력 상세 토글
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
    ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* 헤더 */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-white font-semibold">{mp.title}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg">✕</button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(['profile', 'history'] as MyPageTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'profile' ? mp.tabProfile : mp.tabHistory}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">

          {/* ── 프로필 수정 탭 ── */}
          {activeTab === 'profile' && (
            <>
              {/* 계정 정보 (읽기 전용) */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{mp.accountInfo}</h3>
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t.auth.email}</span>
                    <span className="text-slate-900 font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{mp.joinedAt}</span>
                    <span className="text-slate-900">{joinedDate}</span>
                  </div>
                </div>
              </section>

              {/* 기본 정보 수정 */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{mp.editProfile}</h3>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">{t.auth.name}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder={t.auth.namePlaceholder}
                      className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">{t.auth.birthDate}</label>
                    <input
                      type="date"
                      value={profileBirthDate}
                      onChange={e => setProfileBirthDate(e.target.value)}
                      className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {profileMsg && (
                    <p className={`text-xs px-3 py-2 rounded-lg ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {profileMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {savingProfile ? mp.savingProfile : mp.saveProfile}
                  </button>
                </form>
              </section>

              {/* 비밀번호 변경 */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{mp.changePassword}</h3>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                  <input
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder={mp.currentPasswordPlaceholder}
                    required
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder={mp.newPasswordPlaceholder}
                    required
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder={mp.confirmPasswordPlaceholder}
                    required
                    className={`px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      confirmPw && confirmPw !== newPw ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  {pwMsg && (
                    <p className={`text-xs px-3 py-2 rounded-lg ${pwMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {pwMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingPw}
                    className="py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {savingPw ? mp.saving : mp.savePassword}
                  </button>
                </form>
              </section>

              {/* 로그아웃 */}
              <button
                onClick={() => { onLogout(); onClose() }}
                className="w-full py-2 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-sm rounded-lg transition-colors"
              >
                {t.auth.logout}
              </button>
            </>
          )}

          {/* ── 분석 이력 탭 ── */}
          {activeTab === 'history' && (
            <>
              {historyLoading && (
                <p className="text-sm text-slate-400 text-center py-8">{mp.historyLoading}</p>
              )}
              {!historyLoading && history.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">{mp.historyEmpty}</p>
              )}
              {!historyLoading && history.map(item => (
                <div key={item.id} className="border border-slate-100 rounded-xl overflow-hidden">
                  {/* 목록 행 */}
                  <button
                    onClick={() => toggleDetail(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      item.type === 'code'
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {item.type === 'code' ? mp.historyCode : mp.historyProject}
                    </span>
                    <span className="text-sm text-slate-700 font-medium truncate flex-1">{item.target_name}</span>
                    {item.tech_stack && (
                      <span className="text-xs text-slate-400 shrink-0">{item.tech_stack}</span>
                    )}
                    <span className="text-xs text-slate-300 shrink-0">
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="text-slate-300 text-xs">{expandedId === item.id ? '▲' : '▼'}</span>
                  </button>

                  {/* 상세 펼침 */}
                  {expandedId === item.id && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 text-xs text-slate-600">
                      {detailLoading && <p className="text-slate-400">로딩 중...</p>}
                      {!detailLoading && detail && item.type === 'code' && (
                        <CodeDetail result={detail.result} />
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

// 코드 분석 이력 상세
function CodeDetail({ result }: { result: Record<string, unknown> }) {
  return (
    <div className="flex flex-col gap-2">
      <div><span className="font-semibold text-slate-700">언어:</span> {String(result.language ?? '-')}</div>
      <div>
        <span className="font-semibold text-slate-700">요약:</span>
        <p className="mt-1 text-slate-600 leading-relaxed">{String(result.summary ?? '-')}</p>
      </div>
      {Array.isArray(result.patterns) && result.patterns.length > 0 && (
        <div>
          <span className="font-semibold text-slate-700">주요 패턴:</span>
          <ul className="mt-1 list-disc list-inside text-slate-600 space-y-0.5">
            {(result.patterns as string[]).slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
      {Array.isArray(result.recommendations) && (
        <div className="text-slate-400">추천 개선사항 {(result.recommendations as unknown[]).length}개</div>
      )}
    </div>
  )
}

// 프로젝트 분석 이력 상세
function ProjectDetail({ result }: { result: Record<string, unknown> }) {
  const stats = result.stats as { class_count: number; edge_count: number } | undefined
  const frameworks = result.frameworks as string[] | undefined
  return (
    <div className="flex flex-col gap-2">
      {frameworks && frameworks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-700">프레임워크:</span>
          {frameworks.map(fw => (
            <span key={fw} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-600">{fw}</span>
          ))}
        </div>
      )}
      {stats && (
        <div className="flex gap-4">
          <div><span className="font-semibold text-slate-700">클래스:</span> {stats.class_count}개</div>
          <div><span className="font-semibold text-slate-700">호출:</span> {stats.edge_count}개</div>
        </div>
      )}
    </div>
  )
}
