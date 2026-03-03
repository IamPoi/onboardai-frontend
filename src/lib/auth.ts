const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const TOKEN_KEY = 'codelens-token'

export interface UserInfo {
  id: number
  email: string
  created_at: string
}

// ── 토큰 저장소 ──────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// ── API 함수 ─────────────────────────────────────────────────────────────────

export async function registerApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
  return data.access_token as string
}

export async function loginApi(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
  return data.access_token as string
}

export async function meApi(token: string): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
