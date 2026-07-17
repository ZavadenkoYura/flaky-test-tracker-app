export type AiCategory = 'timing' | 'network' | 'assertion' | 'environment' | 'unknown'

export interface FlakyTestResult {
  test_key: string
  suite: string
  name: string
  total_runs: number
  passed: number
  failed: number
  flakiness_score: number
  ai_category: AiCategory | null
  ai_summary: string | null
  ai_suggestion: string | null
}

export type Plan = 'free' | 'pro'

export interface CurrentUser {
  username: string
  displayName: string
  avatarUrl: string | null
  plan: Plan
  memberSince: string
}

export interface CheckoutSession {
  url: string
}

export interface GithubRepo {
  full_name: string
  name: string
  description: string | null
  private: boolean
  html_url: string
  updated_at: string
  pushed_at: string
  ci: {
    hasWorkflows: boolean
    workflowCount: number
  }
}

export interface PaginatedRepos {
  repos: GithubRepo[]
  page: number
  perPage: number
  totalPages: number
}

export interface ApiTokenSummary {
  id: number
  repo: string
  name: string | null
  lastFour: string
  createdAt: string
  lastUsedAt: string | null
}

export interface IssuedApiToken {
  id: number
  repo: string
  name: string | null
  token: string
  lastFour: string
  createdAt: string
}
