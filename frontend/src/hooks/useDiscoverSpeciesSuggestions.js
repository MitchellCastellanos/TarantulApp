import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import speciesService from '../services/speciesService'

const DEFAULT_DEBOUNCE_MS = 300

/**
 * Debounced catálogo público + GBIF + WSC para el buscador de Descubrir.
 * @param {string} query
 * @param {{ pauseWhenQueryMatches?: string | null, debounceMs?: number }} [options]
 */
export function useDiscoverSpeciesSuggestions(query, options = {}) {
  const { pauseWhenQueryMatches = null, debounceMs = DEFAULT_DEBOUNCE_MS } = options

  const [suggestions, setSuggestions] = useState([])
  const [gbifResults, setGbifResults] = useState([])
  const [wscResults, setWscResults] = useState([])
  const [gbifLoading, setGbifLoading] = useState(false)
  const [wscLoading, setWscLoading] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)

  const debounceRef = useRef(null)
  const searchGenRef = useRef(0)

  const resetSuggestions = useCallback(() => {
    searchGenRef.current += 1
    setSuggestions([])
    setGbifResults([])
    setWscResults([])
    setGbifLoading(false)
    setWscLoading(false)
    setSearchBusy(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = (query || '').trim()
    if (q.length < 2) {
      setSearchBusy(false)
      setSuggestions([])
      setGbifResults([])
      setWscResults([])
      return
    }
    const pause = (pauseWhenQueryMatches || '').trim()
    if (pause && q.toLowerCase() === pause.toLowerCase()) {
      return
    }
    setSearchBusy(true)
    debounceRef.current = setTimeout(() => {
      const gen = ++searchGenRef.current
      setGbifLoading(true)
      setWscLoading(true)
      Promise.allSettled([
        speciesService
          .getDiscoverCatalog(q)
          .then((rows) => {
            if (gen !== searchGenRef.current) return
            setSuggestions(Array.isArray(rows) ? rows.slice(0, 8) : [])
          })
          .catch(() => {
            if (gen !== searchGenRef.current) return
            setSuggestions([])
          }),
        speciesService
          .searchGbif(q)
          .then((rows) => {
            if (gen !== searchGenRef.current) return
            setGbifResults(Array.isArray(rows) ? rows : [])
          })
          .catch(() => {
            if (gen !== searchGenRef.current) return
            setGbifResults([])
          }),
        speciesService
          .searchWsc(q)
          .then((rows) => {
            if (gen !== searchGenRef.current) return
            setWscResults(Array.isArray(rows) ? rows : [])
          })
          .catch(() => {
            if (gen !== searchGenRef.current) return
            setWscResults([])
          }),
      ]).finally(() => {
        if (gen !== searchGenRef.current) return
        setSearchBusy(false)
        setGbifLoading(false)
        setWscLoading(false)
      })
    }, debounceMs)
    return () => clearTimeout(debounceRef.current)
  }, [query, pauseWhenQueryMatches, debounceMs])

  const exactLocalSpeciesHit = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (q.length < 2) return false
    return suggestions.some((s) => (s.scientificName || '').trim().toLowerCase() === q)
  }, [suggestions, query])

  return {
    suggestions,
    gbifResults,
    wscResults,
    gbifLoading,
    wscLoading,
    searchBusy,
    exactLocalSpeciesHit,
    resetSuggestions,
  }
}
