import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUnitSystem, unitLabel, inputStep } from '../utils/units'

export function useUnitSystem() {
  const { user } = useAuth()
  return useMemo(() => {
    const system = getUnitSystem(user)
    return {
      system,
      unit: unitLabel(system),
      isImperial: system === 'imperial',
      step: inputStep(system),
    }
  }, [user])
}
