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
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* 헤더 */}
        <div
          className="px-6 py-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(52,211,153,0.2))' }}
        >
          {/* 배경 오브 */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.2), transparent 70%)', filter: 'blur(20px)' }}
          />
          <div className="flex items-center justify-between relative">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--mint)' }}
              >
                Premium
              </p>
              <h2 className="text-xl font-bold mt-0.5" style={{ color: 'var(--text)' }}>온보딩 가이드 생성</h2>
            </div>
            <button
              onClick={onClose}
              className="text-2xl leading-none transition-colors hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
            >
              ×
            </button>
          </div>
          {/* 가격 */}
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-bold" style={{ color: 'var(--text)' }}>$3</span>
            <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>/ 회</span>
          </div>
        </div>

        {/* 기능 목록 */}
        <div className="px-6 py-5">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            포함 기능
          </p>
          <ul className="flex flex-col gap-2.5">
            {FEATURES.map(f => (
              <li
                key={f.label}
                className="flex items-center gap-3 text-sm"
                style={{ color: f.disabled ? 'var(--text-muted)' : 'var(--text)', opacity: f.disabled ? 0.5 : 1 }}
              >
                <span className="text-base w-5 text-center">{f.icon}</span>
                <span>{f.label}</span>
                {f.disabled && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    준비 중
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 버튼 영역 */}
        <div className="px-6 pb-6 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4">
            <button
              onClick={onConfirm}
              className="aurora-btn w-full py-3.5 rounded-xl font-bold text-sm"
            >
              지금 무료로 체험하기 →
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            취소
          </button>
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            🔒 결제 시스템 준비 중 — 현재 무료 체험 제공
          </p>
        </div>
      </div>
    </div>
  )
}
