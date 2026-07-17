import type {
  ApiTokenSummary,
  CheckoutSession,
  CurrentUser,
  FlakyTestResult,
  IssuedApiToken,
  PaginatedRepos,
} from '@/types/api'

const API_BASE = import.meta.env.SERVICE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export const githubLoginUrl = `${API_BASE}/auth/github`

export async function getFlakyTests(repo: string, windowSize = 30): Promise<FlakyTestResult[]> {
  const url = `${API_BASE}/flaky/${encodeURIComponent(repo)}?window=${windowSize}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}

// Returns null when not signed in, rather than throwing — 401 is an
// expected steady state for anonymous visitors, not an error condition.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}

// 'all' returns every repo GitHub grants access to (for the Repos tab);
// 'ci' returns only repos with GitHub Actions workflows detected, filtered
// and paginated server-side — that's the set repo pickers should offer,
// since picking a repo with no CI wired up has nothing to show.
export type RepoScope = 'all' | 'ci'

export async function getUserRepos(scope: RepoScope, page = 1, perPage = 100): Promise<PaginatedRepos> {
  const res = await fetch(`${API_BASE}/auth/repos?scope=${scope}&page=${page}&per_page=${perPage}`, {
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}

export async function logout(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
}

export async function getApiTokens(): Promise<ApiTokenSummary[]> {
  const res = await fetch(`${API_BASE}/tokens`, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}

export async function createApiToken(repo: string, name?: string): Promise<IssuedApiToken> {
  const res = await fetch(`${API_BASE}/tokens`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, name }),
  })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}

export async function revokeApiToken(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/tokens/${id}`, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
}

export async function createCheckoutSession(): Promise<CheckoutSession> {
  const res = await fetch(`${API_BASE}/billing/checkout`, { method: 'POST', credentials: 'include' })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}

export async function createBillingPortalSession(): Promise<CheckoutSession> {
  const res = await fetch(`${API_BASE}/billing/portal`, { method: 'POST', credentials: 'include' })
  if (!res.ok) {
    throw new Error(`request failed with status ${res.status}`)
  }
  return res.json()
}