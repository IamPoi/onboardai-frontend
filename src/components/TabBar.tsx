import { useLang } from '../contexts/LangContext'

export type TabKey = 'project' | 'code'

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export default function TabBar({ active, onChange }: Props) {
  const { t } = useLang()

  return (
    <div className="flex border-b border-gray-200 w-full max-w-2xl">
      {(['project', 'code'] as TabKey[]).map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-6 py-2.5 text-sm font-medium transition-colors ${
            active === tab
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {tab === 'project' ? t.tabs.project : t.tabs.code}
        </button>
      ))}
    </div>
  )
}
