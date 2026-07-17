import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getCurrentUser, logout as logoutRequest } from '@/lib/api'
import type { AuthState } from '@/types/auth'

import { queryKeys } from './keys'

// The single source of truth for "who's signed in" — every component reads
// this instead of holding its own copy, so a login/logout anywhere is
// instantly reflected everywhere without prop-drilling or context.
function useCurrentUserQuery() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: getCurrentUser,
    retry: false,
  })
}

export function useAuth(): { auth: AuthState; logout: () => Promise<void> } {
  const queryClient = useQueryClient()
  const { data, isLoading } = useCurrentUserQuery()

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      // Every other cached query (repos, tokens, flaky-test results) is
      // scoped to the signed-in user — drop it all rather than risk the
      // next user seeing a stale cache from whoever was signed in before.
      queryClient.clear()
      queryClient.setQueryData(queryKeys.currentUser, null)
    },
  })

  const auth: AuthState = isLoading
    ? { status: 'checking' }
    : data
      ? { status: 'authenticated', user: data }
      : { status: 'anonymous' }

  return {
    auth,
    logout: () => logoutMutation.mutateAsync(),
  }
}
