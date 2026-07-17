import { useMutation } from '@tanstack/react-query'

import { createBillingPortalSession, createCheckoutSession } from '@/lib/api'

// These don't cache anything — they're one-shot actions that redirect the
// browser — but useMutation still gives callers consistent isPending/error
// state instead of another hand-rolled boolean.
export function useCreateCheckoutSession() {
  return useMutation({ mutationFn: createCheckoutSession })
}

export function useCreateBillingPortalSession() {
  return useMutation({ mutationFn: createBillingPortalSession })
}
