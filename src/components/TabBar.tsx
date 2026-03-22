import { useLang } from '../contexts/LangContext'

export type TabKey = 'project' | 'code' | 'onboarding'

const TAB_ICONS: Record<string, string> = {
  project: '🔍',
  code:    '📄',
}

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export default function TabBar({ active, onChange }: Props) {
  const { t } = useLang()

  const labels: Record<string, string> = {
    project: t.tabs.project,
    code:    t.tabs.code,
  }

  return (
    <div
      className="flex gap-1 rounded-xl p-1 w-full max-w-sm"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
    >
      {(['project', 'code'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all"
          style={
            active === tab
              ? { background: 'linear-gradient(135deg, var(--purple), var(--mint))', color: 'white' }
              : { color: 'var(--text-muted)' }
          }
        >
          <span>{TAB_ICONS[tab]}</span>
          <span>{labels[tab]}</span>
        </button>
      ))}
    </div>
  )
}
