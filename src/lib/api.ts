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

export interface GraphResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: { class_count: number; edge_count: number }
  frameworks: string[]
}

export interface JobResponse {
  status: JobStatus
  result?: GraphResult
  error?: string
}

export async function submitRepo(repoUrl: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.job_id as string
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
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
