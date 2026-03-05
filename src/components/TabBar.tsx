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
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-full max-w-sm">
      {(['project', 'code'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
            active === tab
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>{TAB_ICONS[tab]}</span>
          <span>{labels[tab]}</span>
        </button>
      ))}
    </div>
  )
}
