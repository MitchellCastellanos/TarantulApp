import { QueryClient } from '@tanstack/react-query'

/**
 * Defaults tuned for a mobile-first SPA: short stale window, no refetch-on-focus storm,
 * bounded memory via gcTime.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
