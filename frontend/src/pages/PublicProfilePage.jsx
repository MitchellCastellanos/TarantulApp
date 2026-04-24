import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandLogoMark from '../components/BrandLogoMark'
import BrandName from '../components/BrandName'
import api, { imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import logsService from '../services/logsService'
import moderationService from '../services/moderationService'
import FangPanel from '../components/FangPanel'
import { publicUrl } from '../utils/publicAssets.js'
import { PARCHMENT_HISTORY_PAGE_SIZE } from '../constants/parchmentHistory.js'
import { formatDateInUserZone, formatEventDateTime } from '../utils/dateFormat'
import ProTrialCtaLink from '../components/ProTrialCtaLink'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const STATUS_CFG   = {
  active:          { color: 'success' },
  pre_molt:        { color: 'warning' },
  pending_feeding: { color: 'danger'  },
  deceased:        { color: 'secondary' },
}

const PREY_OPTIONS = [
  { value: 'Cricket', labelKey: 'logModals.preyCricket' },
  { value: 'Dubia', labelKey: 'logModals.preyDubia' },
  { value: 'Superworm', labelKey: 'logModals.preySuperworm' },
  { value: 'Worm', labelKey: 'logModals.preyWorm' },
  { value: 'Mealworm', labelKey: 'logModals.preyMealworm' },
  { value: 'Other', labelKey: 'logModals.preyOther' },
]

const defaultSpiderStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center',
  opacity: 0.95,
  padding: '6px',
  boxSizing: 'border-box',
}

export default function PublicProfilePage() {
  const { shortId } = useParams()
  const { user }    = useAuth()
  const { t, i18n } = useTranslation()

  const [profile, setProfile]   = useState(null)
  const [timeline, setTimeline] = useState([])
  const [error, setError]       = useState('')
  const [quickLog, setQuickLog] = useState(null)
  const [saved, setSaved]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [historyPageIndex, setHistoryPageIndex] = useState(0)
  const [reporting, setReporting] = useState(false)
  const [reportSent, setReportSent] = useState('')

  const [feed, setFeed]   = useState({ preyType: 'Cricket', preySize: 'medium', quantity: 1, accepted: true, notes: '' })
  const [molt, setMolt]   = useState({ preSizeCm: '', postSizeCm: '', notes: '' })
  const [behav, setBehav] = useState({ mood: 'active', notes: '' })

  const load = () => {
    api.get(`/public/t/${shortId}`)
       .then(r => {
         setProfile(r.data)
         api.get(`/public/t/${shortId}/timeline`)
            .then(tr => setTimeline(tr.data))
            .catch(() => {})
       })
       .catch(() => setError(t('public.notFound')))
  }

  useEffect(() => { load() }, [shortId])

  useEffect(() => {
    setHistoryPageIndex(0)
  }, [shortId])

  useEffect(() => {
    setHistoryPageIndex(i =>
      Math.min(i, Math.max(0, Math.ceil(timeline.length / PARCHMENT_HISTORY_PAGE_SIZE) - 1)),
    )
  }, [timeline.length])

  const historyTotalPages = Math.max(1, Math.ceil(timeline.length / PARCHMENT_HISTORY_PAGE_SIZE))
  const historyPageSafe = Math.min(historyPageIndex, historyTotalPages - 1)
  const historyPageStart = historyPageSafe * PARCHMENT_HISTORY_PAGE_SIZE
  const timelinePage = timeline.slice(historyPageStart, historyPageStart + PARCHMENT_HISTORY_PAGE_SIZE)
  const showHistoryPager = timeline.length > PARCHMENT_HISTORY_PAGE_SIZE

  /** El backend marca al dueño con el JWT de la petición (más fiable que comparar UUID en el cliente). */
  const isOwner = profile?.viewerIsOwner === true
    || !!(user && profile?.ownerId != null && String(user.id) === String(profile.ownerId))
  /** Pro o periodo de prueba: no depender solo de {@code user.hasProFeatures} por si la sesión quedó desactualizada. */
  const hasProFeatures = (String(user?.plan || 'FREE').trim().toUpperCase() === 'PRO') || user?.inTrial === true
  const canUseQrQuickLog = isOwner && hasProFeatures

  const doSave = async (fn) => {
    setBusy(true)
    setSaved('')
    try {
      await fn()
      setSaved(t('quickLog.saved'))
      setQuickLog(null)
      load()
    } catch {
      setSaved(t('quickLog.error'))
    } finally {
      setBusy(false)
    }
  }

  const reportProfile = async () => {
    const reason = window.prompt(t('public.reportReasonPrompt'))
    if (!reason || !reason.trim()) return
    const details = window.prompt(t('public.reportDetailsPrompt')) || ''
    setReporting(true)
    try {
      await moderationService.reportPublicTarantula(shortId, { reason: reason.trim(), details: details.trim() })
      setReportSent(t('public.reportSent'))
    } catch {
      setReportSent(t('public.reportError'))
    } finally {
      setReporting(false)
    }
  }

  const saveFeed  = () => doSave(() =>
    logsService.addFeeding(profile.tarantulaId, { ...feed, fedAt: new Date().toISOString(), quantity: Number(feed.quantity) }))
  const saveMolt  = () => doSave(() =>
    logsService.addMolt(profile.tarantulaId, {
      moltedAt: new Date().toISOString(),
      preSizeCm:  molt.preSizeCm  ? Number(molt.preSizeCm)  : null,
      postSizeCm: molt.postSizeCm ? Number(molt.postSizeCm) : null,
      notes: molt.notes || null,
    }))
  const saveBehav = () => doSave(() =>
    logsService.addBehavior(profile.tarantulaId, { ...behav, loggedAt: new Date().toISOString() }))

  const eventGlyph = (type) => {
    if (type === 'feeding') return t('timeline.glyphFeeding')
    if (type === 'molt') return t('timeline.glyphMolt')
    return t('timeline.glyphNote')
  }
  const eventLabel = (ev) => {
    if (ev.type === 'feeding') return ev.title === 'feeding_rejected' ? t('timeline.feeding_rejected') : t('timeline.feeding')
    if (ev.type === 'molt')    return t('timeline.molt')
    const moodKey = ev.title
    return `${t('quickLog.behavior')}: ${t(`timeline.${moodKey}`) || moodKey}`
  }

  if (error) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ backgroundImage: `url('${publicUrl('bg-texture.png')}')`, backgroundColor: 'var(--ta-bg)' }}>
      <div className="text-center px-4" style={{ color: 'var(--ta-parchment)', maxWidth: 380 }}>
        <div className="fs-1 mb-3">🔒</div>
        <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
          <BrandLogoMark size={36} showIntro={false} />
          <BrandName className="cinzel fw-bold" style={{ color: 'var(--ta-gold)' }} />
        </div>
        <p className="mb-2" style={{ opacity: 0.8 }}>{t('public.privateCard')}</p>
        {!user && (
          <p className="small mb-4" style={{ opacity: 0.65 }}>{t('public.privateLoginHint')}</p>
        )}
        {user ? (
          <Link to="/" className="btn btn-outline-light btn-sm">
            {t('public.backToCollection')}
          </Link>
        ) : (
          <div className="d-flex flex-column align-items-center gap-2">
            <p className="small mb-2" style={{ opacity: 0.65 }}>{t('public.loginToAccess')}</p>
            <Link to="/login" className="btn btn-sm px-4"
                  state={{ redirectAfterAuth: `/t/${shortId}` }}
                  style={{ background: 'var(--ta-gold)', color: '#111', fontWeight: 600 }}>
              {t('nav.login', 'Sign in')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ backgroundImage: `url('${publicUrl('bg-texture.png')}')`, backgroundColor: 'var(--ta-bg)' }}>
      <p style={{ color: 'var(--ta-parchment)' }}>{t('common.loading')}</p>
    </div>
  )

  const statusCfg   = STATUS_CFG[profile.status] || { color: 'secondary' }
  const statusLabel = t(`status.${profile.status}`) || profile.status

  const MOODS = [
    { value: 'calm',      label: t('moods.calm') },
    { value: 'active',    label: t('moods.active') },
    { value: 'defensive', label: t('moods.defensive') },
    { value: 'hiding',    label: t('moods.hiding') },
    { value: 'pre_molt',  label: t('moods.pre_molt') },
  ]

  return (
    <div className="min-vh-100" style={{ backgroundImage: `url('${publicUrl('bg-texture.png')}')`, backgroundColor: 'var(--ta-bg)' }}>
      <div className="container py-4" style={{ maxWidth: 480 }}>

        {user && (
          <div className="mb-3">
            <Link to="/" className="btn btn-outline-light btn-sm w-100">
              {t('public.backToCollection')}
            </Link>
          </div>
        )}

        {isOwner && profile.isPublic === false && (
          <FangPanel className="mb-3">
            <div className="alert alert-warning border-0 small mb-0 py-3" style={{ color: '#3d2e12' }}>
              {hasProFeatures ? (
                <>
                  <p className="mb-2">{t('public.ownerPrivateBannerPro')}</p>
                  <Link
                    to={`/tarantulas/${profile.tarantulaId}`}
                    className="btn btn-sm btn-dark"
                  >
                    {t('public.openSpecimen')}
                  </Link>
                </>
              ) : (
                <>
                  <p className="mb-2">{t('public.ownerPrivateBannerFree')}</p>
                  <ProTrialCtaLink className="btn btn-sm btn-dark">
                    {t('public.quickActionsUpgrade')}
                  </ProTrialCtaLink>
                </>
              )}
            </div>
          </FangPanel>
        )}

        {/* ─── Ficha pública ──────────────────────────── */}
        <FangPanel className="mb-3">
        <div className="card shadow-lg">
          <div className="d-flex align-items-center justify-content-center overflow-hidden rounded-top"
               style={{ height: 240, background: 'linear-gradient(135deg, var(--ta-bg-deep), var(--ta-bg-panel))' }}>
            {profile.profilePhoto ? (
              <img src={imgUrl(profile.profilePhoto)} alt={profile.name}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <img src={publicUrl('spider-default.png')} alt=""
                   style={defaultSpiderStyle} />
            )}
          </div>

          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h4 className="fw-bold mb-0">{profile.name}</h4>
              <span className={`badge bg-${statusCfg.color} text-${statusCfg.color === 'warning' ? 'dark' : 'white'}`}>
                {statusLabel}
              </span>
            </div>

            {(profile.scientificName || profile.commonName) && (
              <p className="text-muted fst-italic mb-3">
                {HABITAT_ICON[profile.habitatType]} {profile.scientificName}
                {profile.commonName && ` · ${profile.commonName}`}
              </p>
            )}

            <div className="d-flex flex-wrap gap-2 mb-3">
              {profile.stage && (
                <span
                  className="badge border"
                  style={{ background: 'var(--ta-bg-panel)', color: 'var(--ta-text)', borderColor: 'var(--ta-border)' }}
                >
                  {t(`stages.${profile.stage}`) || profile.stage}
                </span>
              )}
              {profile.sex && (
                <span
                  className="badge border"
                  style={{ background: 'var(--ta-bg-panel)', color: 'var(--ta-text)', borderColor: 'var(--ta-border)' }}
                >
                  {t(`sex.${profile.sex}`) || profile.sex}
                </span>
              )}
              {profile.currentSizeCm && (
                <span
                  className="badge border"
                  style={{ background: 'var(--ta-bg-panel)', color: 'var(--ta-text)', borderColor: 'var(--ta-border)' }}
                >
                  {t('tarantula.currentSize')}: {profile.currentSizeCm} cm
                </span>
              )}
            </div>

            <div className="small text-muted">
              <div>{t('public.lastFed')} {formatDateInUserZone(profile.lastFedAt, i18n.language)}</div>
              <div>{t('public.lastMolt')} {formatDateInUserZone(profile.lastMoltAt, i18n.language)}</div>
            </div>
          </div>

          <div className="card-footer text-center small">
            <Link
              to="/descubrir"
              className="text-decoration-none d-inline-flex align-items-center justify-content-center gap-2"
              style={{ color: 'var(--ta-parchment)' }}
            >
              <BrandLogoMark size={32} showIntro={false} />
              <BrandName className="cinzel fw-semibold" />
            </Link>
          </div>
        </div>
        </FangPanel>
        {!isOwner && (
          <div className="mb-3 text-center">
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              disabled={reporting}
              onClick={reportProfile}
            >
              {reporting ? t('common.saving') : t('public.reportProfile')}
            </button>
            {reportSent && <p className="small text-muted mt-2 mb-0">{reportSent}</p>}
          </div>
        )}

        {/* ─── Historial reciente (pergamino, mismo tratamiento que detalle) ─ */}
        <div className="ta-parchment-float-wrap mb-1">
        <div className="card border-0 ta-parchment-history">
          <div className="card-body ta-parchment-scroll p-0">
            <img
              className="ta-parchment-bg-img"
              src={publicUrl('parchment-bg.png')}
              alt=""
              decoding="async"
              draggable={false}
            />
            <div className="ta-parchment-scroll-inner">
              <header className="ta-parchment-page-title">
                <span className="ta-parchment-page-title__icons" aria-hidden>📜</span>
                <span className="ta-parchment-page-title__text">{t('public.history')}</span>
              </header>
              {timeline.length === 0 ? (
                <p className="small mb-0 ta-parchment-muted text-center">{t('public.historyEmpty')}</p>
              ) : (
                <>
                  <ul className="list-unstyled mb-0 flex-grow-1">
                    {timelinePage.map(ev => (
                      <li key={ev.id} className="d-flex align-items-start gap-2 mb-2 pb-2 border-bottom border-light">
                        <span style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>{eventGlyph(ev.type)}</span>
                        <div className="small flex-grow-1">
                          <div className="fw-semibold ta-history-title">{eventLabel(ev)}</div>
                          {ev.summary && <div className="ta-history-summary">{ev.summary}</div>}
                          <div className="ta-history-meta" style={{ fontSize: '0.7rem' }}>{formatEventDateTime(ev.eventDate, i18n.language)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {showHistoryPager && (
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 ta-parchment-pager mt-auto">
                      <button
                        type="button"
                        className="btn btn-sm ta-parchment-pager__btn"
                        disabled={historyPageSafe <= 0}
                        onClick={() => setHistoryPageIndex(p => Math.max(0, p - 1))}
                      >
                        {t('tarantula.historyPrev')}
                      </button>
                      <span className="small ta-parchment-muted mb-0">
                        {t('tarantula.historyPage', { current: historyPageSafe + 1, total: historyTotalPages })}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm ta-parchment-pager__btn"
                        disabled={historyPageSafe >= historyTotalPages - 1}
                        onClick={() => setHistoryPageIndex(p => Math.min(historyTotalPages - 1, p + 1))}
                      >
                        {t('tarantula.historyNext')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* ─── Plan Free: ficha + historial por QR, sin mutaciones; edición desde la colección ─── */}
        {isOwner && !hasProFeatures && (
          <FangPanel>
          <div className="card shadow-sm">
            <div className="card-body p-3 text-center">
              <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📋</div>
              <p className="fw-semibold mb-1 small" style={{ color: 'var(--ta-brown)' }}>
                {t('public.freeOwnerQrReadOnlyTitle')}
              </p>
              <p className="text-muted small mb-3">{t('public.freeOwnerQrReadOnlyBody')}</p>
              <Link
                to={`/tarantulas/${profile.tarantulaId}`}
                className="btn btn-sm btn-dark w-100 mb-3"
              >
                {t('public.freeOwnerOpenInCollection')}
              </Link>
              <p className="text-muted small mb-2">{t('public.quickActionsProCTA')}</p>
              <ProTrialCtaLink className="btn btn-sm px-3 align-self-center btn-outline-secondary">
                {t('public.quickActionsUpgrade')}
              </ProTrialCtaLink>
            </div>
          </div>
          </FangPanel>
        )}

        {/* ─── Panel de registro rápido (propietario con Pro o prueba activa) ── */}
        {canUseQrQuickLog && (
          <FangPanel>
          <div className="card shadow-sm">
            <div className="card-body p-3">
              <p className="fw-semibold mb-2 small" style={{ color: 'var(--ta-brown)' }}>
                {t('quickLog.title')}
              </p>

              {saved && <div className="alert alert-success py-1 small mb-2">{saved}</div>}

              <div className="d-flex gap-2 mb-3 flex-wrap">
                {[
                  { key: 'feeding',  icon: '🍽️', label: t('quickLog.feeding') },
                  { key: 'molt',     icon: '🌙', label: t('quickLog.molt') },
                  { key: 'behavior', icon: '📊', label: t('quickLog.behavior') },
                ].map(({ key, icon, label }) => (
                  <button key={key}
                          className={`btn btn-sm ${quickLog === key ? 'btn-dark' : 'btn-outline-secondary'}`}
                          onClick={() => setQuickLog(quickLog === key ? null : key)}>
                    {icon} {label}
                  </button>
                ))}
              </div>

              {quickLog === 'feeding' && (
                <div className="border rounded p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.prey')}</label>
                      <select className="form-select form-select-sm"
                              value={feed.preyType} onChange={e => setFeed(f => ({ ...f, preyType: e.target.value }))}>
                        {PREY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.size')}</label>
                      <select className="form-select form-select-sm"
                              value={feed.preySize} onChange={e => setFeed(f => ({ ...f, preySize: e.target.value }))}>
                        <option value="small">{t('quickLog.sizeOptSmall')}</option>
                        <option value="medium">{t('quickLog.sizeOptMedium')}</option>
                        <option value="large">{t('quickLog.sizeOptLarge')}</option>
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.qty')}</label>
                      <input type="number" className="form-control form-control-sm" min={1} max={20}
                             value={feed.quantity} onChange={e => setFeed(f => ({ ...f, quantity: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-check mb-2">
                    <input type="checkbox" className="form-check-input" id="accepted"
                           checked={feed.accepted} onChange={e => setFeed(f => ({ ...f, accepted: e.target.checked }))} />
                    <label className="form-check-label small" htmlFor="accepted">{t('quickLog.accepted')}</label>
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder={t('quickLog.notes')}
                         value={feed.notes} onChange={e => setFeed(f => ({ ...f, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveFeed} disabled={busy}>
                    {busy ? t('common.saving') : t('quickLog.saveFeeding')}
                  </button>
                </div>
              )}

              {quickLog === 'molt' && (
                <div className="border rounded p-3 small">
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.preMoltSize')}</label>
                      <input type="number" step="0.1" className="form-control form-control-sm" placeholder={t('quickLog.examplePreCm')}
                             value={molt.preSizeCm} onChange={e => setMolt(m => ({ ...m, preSizeCm: e.target.value }))} />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1 small fw-semibold">{t('quickLog.postMoltSize')}</label>
                      <input type="number" step="0.1" className="form-control form-control-sm" placeholder={t('quickLog.examplePostCm')}
                             value={molt.postSizeCm} onChange={e => setMolt(m => ({ ...m, postSizeCm: e.target.value }))} />
                    </div>
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder={t('quickLog.notes')}
                         value={molt.notes} onChange={e => setMolt(m => ({ ...m, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveMolt} disabled={busy}>
                    {busy ? t('common.saving') : t('quickLog.saveMolt')}
                  </button>
                </div>
              )}

              {quickLog === 'behavior' && (
                <div className="border rounded p-3 small">
                  <label className="form-label mb-2 small fw-semibold">{t('quickLog.mood')}</label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {MOODS.map(({ value, label }) => (
                      <button key={value}
                              className={`btn btn-sm ${behav.mood === value ? 'btn-dark' : 'btn-outline-secondary'}`}
                              onClick={() => setBehav(b => ({ ...b, mood: value }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="text" className="form-control form-control-sm mb-2" placeholder={t('quickLog.notes')}
                         value={behav.notes} onChange={e => setBehav(b => ({ ...b, notes: e.target.value }))} />
                  <button className="btn btn-dark btn-sm w-100" onClick={saveBehav} disabled={busy}>
                    {busy ? t('common.saving') : t('quickLog.saveBehavior')}
                  </button>
                </div>
              )}
            </div>
          </div>
          </FangPanel>
        )}
      </div>
    </div>
  )
}
