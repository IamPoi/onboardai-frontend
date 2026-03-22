const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type JobStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface GraphNode {
  id: string
  data: { label: string; layer: string; methods: string[] }
  position: { x: number; y: number }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
}

export interface CodeIssue {
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO'
  rule_id: string
  message: string
  file: string
  line: number
  suggestion: string
  cwe?: string
  owasp?: string
}

export interface GraphResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: { class_count: number; edge_count: number }
  frameworks: string[]
  mermaid_syntax?: string
  issues?: CodeIssue[]
}

export interface OnboardingResult {
  // v2 풍부한 콘텐츠
  project_overview?: {
    summary: string
    tech_stack: { name: string; purpose: string }[]
  }
  architecture_summary: string
  getting_started?: {
    overview: string
    steps: { step: number; title: string; command: string; description: string }[]
  }
  core_modules?: {
    name: string; layer: string; role: string; why_important: string; key_methods?: string[]
  }[]
  feature_walkthrough?: {
    feature_name: string; description: string; steps: string[]
  }
  key_concepts: { term: string; definition: string }[]
  onboarding_checklist?: string[]
  first_contribution?: {
    title: string; description: string; relevant_files: string[]
  }
  // v1 하위 호환
  top_classes: { name: string; layer: string; role: string; why_important: string }[]
  onboarding_tip: string
}

export interface PaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
  amount: number
}

export async function createPaymentIntent(repoUrl: string, token: string): Promise<PaymentIntentResponse> {
  const res = await fetch(`${BASE_URL}/payments/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ repo_url: repoUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function verifyPayment(paymentIntentId: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ payment_intent_id: paymentIntentId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Payment verification failed`)
  }
}

export interface JobResponse {
  status: JobStatus
  result?: GraphResult
  error?: string
}

// 백엔드 wake-up용 — Render.com free tier cold start 방지
export async function wakeUpServer(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/health_check`, { method: 'GET' })
  } catch {
    // 실패해도 무시 — wake-up 목적이므로
  }
}

export async function submitRepo(repoUrl: string, token?: string): Promise<string> {
  // 90초 타임아웃 — Render.com cold start(~60초) 대응
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ repo_url: repoUrl }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.job_id as string
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('서버 응답 시간이 초과됐습니다. 다시 시도해주세요.')
    }
    if (err instanceof TypeError) {
      throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface CodeAnalysisResult {
  language: string
  summary: string
  patterns: string[]
  errors: { location: string; description: string }[]
  usage: string
  recommendations: { title: string; description: string }[]
}

export async function analyzeCode(
  text: string,
  file: File | null,
  lang: string = 'ko',
  token?: string,
): Promise<CodeAnalysisResult> {
  const form = new FormData()
  if (text) form.append('text', text)
  if (file) form.append('file', file)
  form.append('lang', lang)

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/code-analyze`, {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function onboardingApi(repoUrl: string, lang: string, token?: string): Promise<OnboardingResult> {
  // 90초 타임아웃 (cold start + clone + Groq API 시간 고려)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}/onboarding`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ repo_url: repoUrl, lang }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `HTTP ${res.status}`)
    }
    return res.json()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('요청 시간이 초과됐습니다. 다시 시도해주세요.')
    }
    if (err instanceof TypeError) {
      throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export function pollJob(
  jobId: string,
  onUpdate: (job: JobResponse) => void,
  intervalMs = 2000,
): () => void {
  const id = setInterval(async () => {
    try {
      const job = await getJob(jobId)
      onUpdate(job)
      if (job.status === 'complete' || job.status === 'failed') {
        clearInterval(id)
      }
    } catch {
      clearInterval(id)
    }
  }, intervalMs)
  return () => clearInterval(id)
}
