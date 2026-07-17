import { useQuery } from '@tanstack/react-query'

import { getUserRepos, type RepoScope } from '@/lib/api'

import { queryKeys } from './keys'

interface UseReposOptions {
  enabled?: boolean
}

// scope: 'all' for the Repos tab (every repo GitHub granted access to),
// 'ci' for repo pickers (dashboard search, token generation) — the CI
// filter is applied server-side so pagination reflects the filtered set.
export function useRepos(scope: RepoScope, page: number, perPage: number, options: UseReposOptions = {}) {
  return useQuery({
    queryKey: queryKeys.repos(scope, page, perPage),
    queryFn: () => getUserRepos(scope, page, perPage),
    enabled: options.enabled ?? true,
  })
}
