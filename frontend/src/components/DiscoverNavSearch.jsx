import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/**
 * Búsqueda rápida WSC/GBIF → /descubrir?taxon=… (Navbar y PublicShell).
 */
export default function DiscoverNavSearch({ className = '' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const v = q.trim()
    if (v.length < 2) return
    navigate(`/descubrir?taxon=${encodeURIComponent(v)}`)
    setQ('')
  }

  return (
    <form className={`d-flex align-items-center gap-1 ${className}`.trim()} onSubmit={submit}>
      <input
        type="search"
        className="form-control form-control-sm flex-grow-1"
        placeholder={t('nav.discoverSearchPlaceholder')}
        aria-label={t('nav.discoverSearchAria')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
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
  )
}
