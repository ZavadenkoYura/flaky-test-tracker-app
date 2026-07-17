import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createApiToken, getApiTokens, revokeApiToken } from '@/lib/api'

import { queryKeys } from './keys'

export function useApiTokens() {
  return useQuery({
    queryKey: queryKeys.apiTokens,
    queryFn: getApiTokens,
  })
}

export function useCreateApiToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ repo, name }: { repo: string; name?: string }) => createApiToken(repo, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens }),
  })
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => revokeApiToken(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiTokens }),
  })
}
