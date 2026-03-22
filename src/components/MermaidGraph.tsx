import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  flowchart: { curve: 'basis', padding: 20 },
  securityLevel: 'loose',
})

interface Props {
  syntax: string
}

let _idCounter = 0

export default function MermaidGraph({ syntax }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current || !syntax) return
    setError(null)
    const id = `mermaid-${++_idCounter}`
    mermaid.render(id, syntax)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      })
      .catch(e => {
        setError(String(e))
      })
  }, [syntax])

  if (error) {
    return (
      <div className="p-4 text-red-500 text-sm bg-red-50 rounded-lg">
        Diagram rendering error: {error}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="w-full overflow-auto bg-white rounded-xl p-6 flex justify-center"
      style={{ minHeight: 300 }}
    />
  )
}
