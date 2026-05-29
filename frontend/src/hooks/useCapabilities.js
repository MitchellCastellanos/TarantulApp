import { useQuery } from '@tanstack/react-query'
import meCapabilitiesService from '../services/meCapabilitiesService'
import { useAuth } from '../context/AuthContext'

export const capabilitiesKeys = {
  all: ['capabilities'],
  me: () => [...capabilitiesKeys.all, 'me'],
}

export function useCapabilities() {
  const { token } = useAuth()
  return useQuery({
    queryKey: capabilitiesKeys.me(),
    queryFn: () => meCapabilitiesService.get(),
    enabled: Boolean(token),
    staleTime: 60_000,
  })
}
