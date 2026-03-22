const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const TOKEN_KEY = 'onboardai-token'

export interface UserInfo {
  id: number
  email: string
  name: string | null
  birth_date: string | null
  created_at: string
}

export interface HistoryItem {
  id: number
  type: 'code' | 'project' | 'onboarding'
  target_name: string
  tech_stack: string | null
  created_at: string
}

export interface HistoryDetail extends HistoryItem {
  result: Record<string, unknown>
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

export async function registerApi(
  email: string,
  password: string,
  name?: string,
  birthDate?: string,
): Promise<{ needs_verification: boolean; email: string; access_token?: string }> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: name || null, birth_date: birthDate || null }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
  return data as { needs_verification: boolean; email: string; access_token?: string }
}

export async function verifyEmailApi(email: string, otp: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
  return data.access_token as string
}

export async function resendOtpApi(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? `HTTP ${res.status}`)
  }
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

export async function updateProfileApi(
  token: string,
  name: string | null,
  birthDate: string | null,
): Promise<UserInfo> {
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, birth_date: birthDate }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
  return data as UserInfo
}

export async function getHistoryApi(token: string): Promise<HistoryItem[]> {
  const res = await fetch(`${BASE_URL}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getHistoryDetailApi(token: string, id: number): Promise<HistoryDetail> {
  const res = await fetch(`${BASE_URL}/history/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function changePasswordApi(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? `HTTP ${res.status}`)
  }
}
