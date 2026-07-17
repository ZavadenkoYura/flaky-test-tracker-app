import type { RepoScope } from '@/lib/api'

// Centralized query key factory — keeps cache keys consistent across hooks
// and gives invalidation calls a single source of truth for what to match.
export const queryKeys = {
  currentUser: ['auth', 'currentUser'] as const,
  repos: (scope: RepoScope, page: number, perPage: number) => ['repos', scope, page, perPage] as const,
  flakyTests: (repo: string, windowSize: number) => ['flaky-tests', repo, windowSize] as const,
  apiTokens: ['tokens'] as const,
}
