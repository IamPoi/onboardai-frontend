import { useLang } from '../contexts/LangContext'

interface Error {
  location: string
  description: string
}

interface Recommendation {
  title: string
  description: string
}

export interface AnalysisResult {
  language: string
  summary: string
  patterns: string[]
  errors: Error[]
  usage: string
  recommendations: Recommendation[]
}

interface Props {
  result: AnalysisResult
  onReset: () => void
}

export default function CodeAnalysisResult({ result, onReset }: Props) {
  const { t } = useLang()

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">

      {/* 언어 배지 */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-semibold">
          {result.language}
        </span>
      </div>

      {/* 요약 */}
      <Section title={t.codeAnalysis.result.summary}>
        <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
      </Section>

      {/* 주요 패턴 */}
      {result.patterns.length > 0 && (
        <Section title={t.codeAnalysis.result.patterns}>
          <ul className="flex flex-col gap-1">
            {result.patterns.map((p, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 잠재적 에러 */}
      {result.errors.length > 0 && (
        <Section title={t.codeAnalysis.result.errors} accent="red">
          <ul className="flex flex-col gap-3">
            {result.errors.map((e, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className="text-xs font-mono font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded w-fit">
                  {e.location}
                </span>
                <span className="text-sm text-gray-700">{e.description}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 사용 방법 */}
      <Section title={t.codeAnalysis.result.usage}>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{result.usage}</p>
      </Section>

      {/* 개선 추천 */}
      {result.recommendations.length > 0 && (
        <Section title={t.codeAnalysis.result.recommendations} accent="green">
          <ul className="flex flex-col gap-3">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-800">{r.title}</span>
                <span className="text-sm text-gray-600">{r.description}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <button
        onClick={onReset}
        className="text-sm text-gray-500 underline hover:text-gray-700 text-center"
      >
        {t.app.reset}
      </button>
    </div>
  )
}

function Section({
  title,
  children,
  accent,
}: {
  title: string
  children: React.ReactNode
  accent?: 'red' | 'green'
}) {
  const border = accent === 'red'
    ? 'border-red-200'
    : accent === 'green'
    ? 'border-green-200'
    : 'border-gray-200'

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-2 ${border}`}>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}
