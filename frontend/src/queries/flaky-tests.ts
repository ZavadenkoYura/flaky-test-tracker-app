import { useQuery } from '@tanstack/react-query'

import { getFlakyTests } from '@/lib/api'

import { queryKeys } from './keys'

// Query key includes `repo` and `windowSize`, so picking a different repo or
// editing the run-window both refetch automatically — no separate "search"
// action needed.
export function useFlakyTests(repo: string, windowSize: number) {
  return useQuery({
    queryKey: queryKeys.flakyTests(repo, windowSize),
    queryFn: () => getFlakyTests(repo, windowSize),
    enabled: repo.trim().length > 0,
  })
}
