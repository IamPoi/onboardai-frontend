import { useEffect, useRef } from 'react'

interface Props {
  slot: string       // AdSense 광고 슬롯 ID
  format?: 'auto' | 'rectangle' | 'horizontal'
  className?: string
}

// Google AdSense publisher ID
// ⚠️ 실제 publisher ID로 교체 필요: index.html의 ca-pub-XXXXXXXXX와 동일하게
const PUBLISHER_ID = 'ca-pub-7522569213731555'

export default function AdBanner({ slot, format = 'auto', className = '' }: Props) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adsbygoogle = (window as any).adsbygoogle
      if (adsbygoogle) {
        adsbygoogle.push({})
        pushed.current = true
      }
    } catch {
      // AdSense 로드 전이면 무시
    }
  }, [])

  // publisher ID가 placeholder이면 개발 환경에서 빈 공간 표시
  if (PUBLISHER_ID === 'ca-pub-XXXXXXXXXXXXXXXXX') {
    return (
      <div className={`flex items-center justify-center bg-slate-100 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs ${className}`}>
        광고 영역 (AdSense 연동 후 활성화)
      </div>
    )
  }

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
