interface Props {
  onClose: () => void
  onConfirm: () => void
}

const FEATURES = [
  { icon: '🏗️', label: 'AST 기반 아키텍처 분석' },
  { icon: '🤖', label: 'AI 온보딩 가이드 자동 생성' },
  { icon: '🔑', label: '핵심 클래스 & 의존성 설명' },
  { icon: '📖', label: '핵심 용어 사전 자동 작성' },
  { icon: '📄', label: 'PDF 리포트 내보내기 (준비 중)', disabled: true },
]

export default function PaymentModal({ onClose, onConfirm }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Premium</p>
              <h2 className="text-xl font-bold mt-0.5">온보딩 가이드 생성</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
          {/* 가격 */}
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-bold">$3</span>
            <span className="text-sm opacity-80 mb-1">/ 회</span>
          </div>
        </div>

        {/* 기능 목록 */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">포함 기능</p>
          <ul className="flex flex-col gap-2.5">
            {FEATURES.map(f => (
              <li
                key={f.label}
                className={`flex items-center gap-3 text-sm ${f.disabled ? 'opacity-40' : 'text-slate-700'}`}
              >
                <span className="text-base w-5 text-center">{f.icon}</span>
                <span>{f.label}</span>
                {f.disabled && (
                  <span className="ml-auto text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">준비 중</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 버튼 영역 */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500
                       text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02]
                       transition-all text-sm"
          >
            지금 무료로 체험하기 →
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-400 text-sm hover:text-slate-600 transition-colors"
          >
            취소
          </button>
          <p className="text-center text-xs text-slate-400 mt-1">
            🔒 결제 시스템 준비 중 — 현재 무료 체험 제공
          </p>
        </div>
      </div>
    </div>
  )
}
