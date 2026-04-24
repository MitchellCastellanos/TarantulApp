import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDiscoverSpeciesSuggestions } from '../hooks/useDiscoverSpeciesSuggestions'

/**
 * Misma lógica de sugerencias que Discover; al elegir fila → /discover con ficha lista (speciesId / gbifKey).
 */
export default function DiscoverNavSearch({ className = '' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  const {
    suggestions,
    gbifResults,
    wscResults,
    gbifLoading,
    wscLoading,
    searchBusy,
    exactLocalSpeciesHit,
    resetSuggestions,
  } = useDiscoverSpeciesSuggestions(q, {})

  useEffect(() => {
    const onDocDown = (e) => {
      if (!wrapRef.current || wrapRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const v = q.trim()
    if (v.length < 2) return
    setOpen(false)
    navigate(`/discover?taxon=${encodeURIComponent(v)}`)
    setQ('')
    resetSuggestions()
  }

  const goSpecies = (id) => {
    setOpen(false)
    setQ('')
    resetSuggestions()
    navigate(`/discover?speciesId=${id}`)
  }

  const goGbifKey = (key) => {
    setOpen(false)
    setQ('')
    resetSuggestions()
    navigate(`/discover?gbifKey=${key}`)
  }

  /** Misma idea que Descubrir: panel visible mientras hay búsqueda activa o ya hay filas / vacío final. */
  const showList = open && q.trim().length >= 2

  return (
    <div ref={wrapRef} className={`position-relative ta-nav-discover-search ${className}`.trim()}>
      <form className="d-flex align-items-center gap-1 w-100" onSubmit={submit}>
        <input
          type="search"
          className="form-control form-control-sm flex-grow-1"
          placeholder={t('nav.discoverSearchPlaceholder')}
          aria-label={t('nav.discoverSearchAria')}
          aria-expanded={showList}
          aria-haspopup="listbox"
          autoComplete="off"
          value={q}
          onChange={(e) => {
            const v = e.target.value
            setQ(v)
            setOpen(v.trim().length >= 2)
          }}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          style={{
            background: 'rgba(0,0,0,0.35)',
            borderColor: 'var(--ta-border)',
            color: 'var(--ta-parchment)',
            fontSize: '0.8rem',
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          className="btn btn-sm flex-shrink-0"
          style={{
            background: 'rgba(200, 160, 60, 0.25)',
            border: '1px solid var(--ta-gold)',
            color: 'var(--ta-gold)',
            fontSize: '0.75rem',
          }}
        >
          {t('nav.discoverSearchButton')}
        </button>
      </form>

      {showList && (
        <ul
          role="listbox"
          className="list-group position-absolute w-100 shadow-sm border rounded overflow-auto"
          style={{
            zIndex: 4000,
            top: '100%',
            left: 0,
            marginTop: 4,
            maxHeight: 320,
            borderColor: 'var(--ta-border)',
          }}
        >
          {searchBusy &&
            suggestions.length === 0 &&
            !gbifLoading &&
            !wscLoading &&
            gbifResults.length === 0 &&
            wscResults.length === 0 && (
              <li
                className="list-group-item py-2 px-3 small"
                style={{ background: 'var(--ta-bg-panel)', color: 'var(--ta-text)', cursor: 'default' }}
              >
                {t('common.loading')}
              </li>
            )}
          {suggestions.map((sp) => (
            <li
              key={sp.id}
              role="option"
              className="list-group-item list-group-item-action py-2 px-3"
              style={{ cursor: 'pointer', background: 'var(--ta-bg-card)', color: 'var(--ta-text)' }}
              onMouseDown={(e) => {
                e.preventDefault()
                goSpecies(sp.id)
              }}
            >
              <span className="fw-semibold small">{sp.scientificName}</span>
              {sp.commonName && <span className="text-muted small ms-2">· {sp.commonName}</span>}
              <span className="badge ms-2" style={{ background: 'var(--ta-purple)', color: 'var(--ta-text)', fontSize: '0.65rem' }}>
                {t('discover.badgeCatalog')}
              </span>
            </li>
          ))}

          {!exactLocalSpeciesHit && (wscResults.length > 0 || wscLoading) && (
            <>
              <li
                className="list-group-item py-1 px-3"
                style={{ background: 'var(--ta-bg-panel)', borderTop: '1px solid var(--ta-border)', cursor: 'default' }}
              >
                <span className="small fw-semibold" style={{ color: 'var(--ta-gold)' }}>
                  {wscLoading ? t('form.wscLoading') : t('form.wscLabel')}
                </span>
              </li>
              {wscResults.slice(0, 6).map((wr) => (
                <li
                  key={wr.taxonId ?? wr.name}
                  role="option"
                  className="list-group-item list-group-item-action py-2 px-3"
                  style={{ cursor: 'pointer', background: 'var(--ta-bg-card)', color: 'var(--ta-text)' }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    const key = wr.taxonId != null ? Number(String(wr.taxonId).trim()) : NaN
                    if (!Number.isFinite(key)) return
                    goGbifKey(key)
                  }}
                >
                  <span className="fw-semibold small">{wr.name}</span>
                  {wr.family && (
                    <span className="badge ms-2" style={{ background: 'var(--ta-purple)', color: 'var(--ta-text)', fontSize: '0.65rem' }}>
                      {wr.family}
                    </span>
                  )}
                </li>
              ))}
            </>
          )}

          {!exactLocalSpeciesHit && (gbifResults.length > 0 || gbifLoading) && (
            <>
              <li
                className="list-group-item py-1 px-3"
                style={{ background: 'var(--ta-bg-panel)', borderTop: '1px solid var(--ta-border)', cursor: 'default' }}
              >
                <span className="small fw-semibold" style={{ color: 'var(--ta-gold)' }}>
                  {gbifLoading ? t('form.gbifLoading') : t('form.gbifLabel')}
                </span>
              </li>
              {gbifResults.slice(0, 6).map((gr) => (
                <li
                  key={gr.key}
                  role="option"
                  className="list-group-item list-group-item-action py-2 px-3"
                  style={{ cursor: 'pointer', background: 'var(--ta-bg-card)', color: 'var(--ta-text)' }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    goGbifKey(Number(gr.key))
                  }}
                >
                  <span className="fw-semibold small">{gr.canonicalName || gr.scientificName}</span>
                  {gr.vernacularName && <span className="text-muted small ms-2">· {gr.vernacularName}</span>}
                </li>
              ))}
            </>
          )}

          {q.trim().length >= 2 && !searchBusy && !gbifLoading && !wscLoading && suggestions.length === 0 && gbifResults.length === 0 && wscResults.length === 0 && (
            <li
              className="list-group-item py-2 px-3 small text-muted"
              style={{ background: 'var(--ta-bg-panel)', cursor: 'default' }}
            >
              {t('discover.noSearchHits')}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
