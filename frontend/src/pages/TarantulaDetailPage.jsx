import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import StatusBadge from '../components/StatusBadge'
import TimelineItem from '../components/TimelineItem'
import FeedingModal from '../components/FeedingModal'
import MoltModal from '../components/MoltModal'
import BehaviorModal from '../components/BehaviorModal'
import QRModal from '../components/QRModal'
import PhotoGallery from '../components/PhotoGallery'
import FangPanel from '../components/FangPanel'
import ChitinCardFrame from '../components/ChitinCardFrame'
import SpeciesProfileCard from '../components/SpeciesProfileCard'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import TaSegmentedControl from '../components/TaSegmentedControl'
import tarantulaService from '../services/tarantulaService'
import logsService from '../services/logsService'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'
import { useAppTheme } from '../hooks/useAppTheme'
import { PARCHMENT_HISTORY_PAGE_SIZE } from '../constants/parchmentHistory.js'
import { formatDateInUserZone, formatDateTimeInUserZone } from '../utils/dateFormat'
import { exportTarantulaPdf } from '../services/pdfExportService'
import { computeTerrariumRecommendation } from '../utils/terrariumEstimate'
import reminderService from '../services/reminderService'
import {
  readDismissedAutoKeys,
  dismissAutomaticReminder,
  dismissedAutoReminderKey,
} from '../utils/dismissedAutoReminders'
import { remindersPrefillUrl } from '../utils/reminderDeepLink'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }
const REMINDER_TYPE_ICONS = { feeding: '🍽️', feeding_auto: '🤖', cleaning: '🧹', checkup: '🔍', custom: '📌' }

function reminderOverdue(iso) {
  return new Date(iso) < new Date()
}

export default function TarantulaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const theme = useAppTheme()
  const { user, token } = useAuth()
  const hasProFeatures = user?.hasProFeatures === true

  const [tarantula, setTarantula] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'feeding' | 'molt' | 'behavior' | 'qr' | 'deceased'
  const [deceasedNotes, setDeceasedNotes] = useState('')
  const [deceasedDate, setDeceasedDate] = useState(new Date().toISOString().slice(0, 10))
  const [historyPageIndex, setHistoryPageIndex] = useState(0)
  const [detailTab, setDetailTab] = useState('profile')
  const [spiderReminders, setSpiderReminders] = useState([])
  const [dismissedAuto, setDismissedAuto] = useState(() => readDismissedAutoKeys())

  /** En plan Free sin prueba, solo las 6 más antiguas son editables; el resto viene con locked=true desde el API. */
  const mayEdit = tarantula ? !tarantula.locked : false
  const canDeleteSpider = true

  const load = useCallback((showFullPageLoading = true) => {
    if (showFullPageLoading) setLoading(true)
    Promise.all([
      tarantulaService.getById(id),
      tarantulaService.getTimeline(id),
    ]).then(([t, tl]) => {
      setTarantula(t)
      setTimeline(tl)
    }).finally(() => {
      if (showFullPageLoading) setLoading(false)
    })
  }, [id])

  useEffect(() => { load(true) }, [load])

  useEffect(() => {
    setHistoryPageIndex(0)
  }, [id])

  useEffect(() => {
    setDetailTab('profile')
  }, [id])

  const detailTabOptions = useMemo(
    () => [
      { id: 'profile', label: t('tarantula.tabProfile') },
      { id: 'timeline', label: t('tarantula.tabTimeline') },
      { id: 'care', label: t('tarantula.tabCare') },
      { id: 'reminders', label: t('tarantula.tabReminders') },
      { id: 'notes', label: t('tarantula.tabNotes') },
      { id: 'gallery', label: t('tarantula.tabGallery') },
    ],
    [t],
  )

  const loadSpiderReminders = useCallback(() => {
    if (!token || !id) {
      setSpiderReminders([])
      return
    }
    reminderService
      .getAll()
      .then((all) => {
        const list = Array.isArray(all) ? all : []
        setSpiderReminders(list.filter((r) => String(r.tarantulaId || '') === String(id)))
      })
      .catch(() => setSpiderReminders([]))
  }, [id, token])

  useEffect(() => {
    if (!token || !id) {
      setSpiderReminders([])
      return
    }
    if (detailTab !== 'reminders') return
    loadSpiderReminders()
  }, [id, token, detailTab, loadSpiderReminders])

  const spiderRemindersActive = useMemo(
    () =>
      spiderReminders.filter((r) => {
        const k = dismissedAutoReminderKey(r)
        return !k || !dismissedAuto.has(k)
      }),
    [spiderReminders, dismissedAuto],
  )

  const spiderRemindersUpcoming = useMemo(() => {
    const rows = spiderRemindersActive.filter((r) => !r.isDone)
    return [...rows].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }, [spiderRemindersActive])

  const spiderRemindersDone = useMemo(() => {
    const rows = spiderRemindersActive.filter((r) => r.isDone)
    return [...rows].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)).slice(0, 30)
  }, [spiderRemindersActive])

  const handleSpiderReminderDone = async (r) => {
    if (r.source === 'automatic') {
      dismissAutomaticReminder(r)
      setDismissedAuto(readDismissedAutoKeys())
      return
    }
    if (!r.id) return
    await reminderService.markDone(r.id)
    loadSpiderReminders()
  }

  const handleSpiderReminderDelete = async (reminderId) => {
    if (!confirm(t('reminders.deleteConfirm'))) return
    await reminderService.delete(reminderId)
    loadSpiderReminders()
  }

  const historyTotalPages = Math.max(1, Math.ceil(timeline.length / PARCHMENT_HISTORY_PAGE_SIZE))
  const historyPageSafe = Math.min(historyPageIndex, historyTotalPages - 1)
  const historyPageStart = historyPageSafe * PARCHMENT_HISTORY_PAGE_SIZE
  const timelinePage = timeline.slice(historyPageStart, historyPageStart + PARCHMENT_HISTORY_PAGE_SIZE)
  const showHistoryPager = timeline.length > PARCHMENT_HISTORY_PAGE_SIZE

  useEffect(() => {
    setHistoryPageIndex(i => Math.min(i, Math.max(0, Math.ceil(timeline.length / PARCHMENT_HISTORY_PAGE_SIZE) - 1)))
  }, [timeline.length])

  const handleLogSaved = () => { setModal(null); load(false) }

  const handleDeleteEvent = async (logId, type) => {
    if (!confirm(t('tarantula.deleteEvent'))) return
    if (type === 'feeding')  await logsService.deleteFeeding(logId)
    if (type === 'molt')     await logsService.deleteMolt(logId)
    if (type === 'behavior') await logsService.deleteBehavior(logId)
    load(false)
  }

  const handleTogglePublic = async () => {
    const updated = await tarantulaService.togglePublic(id)
    setTarantula(updated)
  }

  const handleDelete = async () => {
    if (!confirm(t('tarantula.deleteConfirm', { name: tarantula.name }))) return
    await tarantulaService.delete(id)
    navigate('/')
  }

  const handleMarkDeceased = async () => {
    const updated = await tarantulaService.markDeceased(id, {
      notes: deceasedNotes || null,
      deceasedAt: deceasedDate ? new Date(deceasedDate).toISOString() : null,
    })
    setTarantula(updated)
    setModal(null)
  }

  const handleExportPdf = () => {
    exportTarantulaPdf({
      tarantula,
      species,
      timeline,
      t,
      language: i18n.language,
      i18n,
    }).catch(() => {})
  }
  const publicProfileUrl = tarantula?.shortId ? `${window.location.origin}/t/${tarantula.shortId}` : ''

  if (loading) return (
    <div><Navbar /><div className="container mt-4 text-muted">{t('tarantula.loading')}</div></div>
  )
  if (!tarantula) return (
    <div><Navbar /><div className="container mt-4 text-danger">{t('tarantula.notFound')}</div></div>
  )

  const { species } = tarantula
  const spiderPlaceholder = publicUrl('spider-default.png')
  const displayProfilePhoto = tarantula.profilePhoto
    ? imgUrl(tarantula.profilePhoto)
    : imgUrl(species?.referencePhotoUrl) || spiderPlaceholder
  const brandLogoSrc = publicUrl(theme === 'light' ? 'logo-black.png' : 'logo-neon.png')

  // ─── Terrarium recommendation ──────────────────────────────────────────────
  const terrariumRec = computeTerrariumRecommendation(tarantula.currentSizeCm, species)

  return (
    <div className="ta-premium-page">
      <Navbar />
      {modal === 'feeding'  && <FeedingModal  tarantulaId={id} onClose={() => setModal(null)} onSaved={handleLogSaved} />}
      {modal === 'molt'     && <MoltModal     tarantulaId={id} onClose={() => setModal(null)} onSaved={handleLogSaved} />}
      {modal === 'behavior' && <BehaviorModal tarantulaId={id} onClose={() => setModal(null)} onSaved={handleLogSaved} />}
      {modal === 'qr'       && <QRModal tarantula={tarantula}  onClose={() => setModal(null)} />}

      {modal === 'deceased' && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={() => setModal(null)}>
          <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('tarantula.deceasedModal')}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3"
                   dangerouslySetInnerHTML={{ __html: t('tarantula.deceasedDesc', { name: `<strong>${tarantula.name}</strong>` }) }} />
                <div className="mb-3">
                  <label className="form-label fw-semibold small">{t('tarantula.deceasedDate')}</label>
                  <input type="date" className="form-control"
                         value={deceasedDate}
                         onChange={e => setDeceasedDate(e.target.value)} />
                </div>
                <div className="mb-1">
                  <label className="form-label fw-semibold small">{t('tarantula.deceasedNotes')}</label>
                  <textarea className="form-control" rows={3}
                            placeholder={t('logModals.optional')}
                            value={deceasedNotes}
                            onChange={e => setDeceasedNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModal(null)}>
                  {t('common.cancel')}
                </button>
                <button className="btn btn-sm" style={{ background: 'rgba(140,90,10,0.6)', color: '#ffd9a0', border: '1px solid rgba(200,140,30,0.4)' }}
                        onClick={handleMarkDeceased}>
                  🕯️ {t('tarantula.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mt-4 ta-premium-shell ta-premium-shell--detail-wide">
        {/* Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <button className="btn btn-link p-0 text-collection text-decoration-none" onClick={() => navigate('/')}>
            {t('common.back')}
          </button>
          <span className="text-collection">/</span>
          <span className="text-collection">{tarantula.name}</span>
        </div>

        {tarantula.deceasedAt && (
          <div className="alert mb-3 ta-memorial">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span style={{ fontSize: '1.4rem' }}>🕯️</span>
              <strong style={{ fontFamily: 'Cinzel, serif' }}>{t('tarantula.inMemoryOf')} {tarantula.name}</strong>
            </div>
            <div className="small" style={{ opacity: 0.85 }}>
              {t('tarantula.deceasedOn')} {formatDateInUserZone(tarantula.deceasedAt, i18n.language)}.
              {tarantula.deathNotes && <> {tarantula.deathNotes}</>}
            </div>
          </div>
        )}

        <TaSegmentedControl
          className="mb-3"
          ariaLabel={t('tarantula.detailTabsAria')}
          value={detailTab}
          onChange={setDetailTab}
          options={detailTabOptions}
        />

        {detailTab === 'profile' && (
          <div className="mx-auto" style={{ maxWidth: 520 }}>
            <FangPanel className="ta-spider-detail-fang">
              <div className="card border-0 shadow-sm ta-premium-pane ta-tarantula-detail-main-card">
                <div
                  className="d-flex align-items-center justify-content-center overflow-hidden rounded-top position-relative ta-tarantula-detail-photo-stage"
                  style={{ height: 220, background: 'linear-gradient(135deg,#0c0c1e,#1a1040)' }}
                >
                  <img
                    src={displayProfilePhoto}
                    alt={tarantula.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = spiderPlaceholder
                    }}
                  />
                  <img
                    src={`${brandLogoSrc}?v=2`}
                    alt=""
                    className="ta-tarantula-detail-brand-mark"
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    aria-hidden
                  />
                </div>

                <div className="card-body">
                  {!mayEdit && (
                    <div className="alert alert-warning small py-2 mb-2">
                      {t('tarantula.freePlanLockedBanner')}
                      <ProTrialCtaLink className="btn btn-sm ms-2">{t('pro.upgradeNow')}</ProTrialCtaLink>
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold mb-0">{tarantula.name}</h5>
                    <StatusBadge status={tarantula.status} />
                  </div>

                  {species && (
                    <p className="text-muted small fst-italic mb-2">
                      {HABITAT_ICON[species.habitatType]} {species.scientificName}
                      {species.commonName && ` · ${species.commonName}`}
                    </p>
                  )}

                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {tarantula.stage && (
                      <span className="badge bg-light text-dark border">{t(`stages.${tarantula.stage}`)}</span>
                    )}
                    {tarantula.sex && (
                      <span className="badge bg-light text-dark border">{t(`sex.${tarantula.sex}`)}</span>
                    )}
                    {tarantula.currentSizeCm && (
                      <span className="badge bg-light text-dark border">📏 {tarantula.currentSizeCm} cm</span>
                    )}
                  </div>

                  <div className="small text-muted">
                    <div>📅 {t('tarantula.purchaseDate')}: {formatDateInUserZone(tarantula.purchaseDate, i18n.language)}</div>
                    <div>{t('tarantula.lastFed')}: {formatDateInUserZone(tarantula.lastFedAt, i18n.language)}</div>
                    <div>{t('tarantula.lastMolt')}: {formatDateInUserZone(tarantula.lastMoltAt, i18n.language)}</div>
                  </div>
                </div>

                <div className="card-footer bg-transparent border-top-0 d-flex gap-2 flex-wrap">
                  {!tarantula.deceasedAt && (
                    <>
                      {!mayEdit ? (
                        <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" disabled title={t('tarantula.lockedEditHint')}>
                          ✏️ {t('common.edit')}
                        </button>
                      ) : (
                        <Link to={`/tarantulas/${id}/edit`} className="btn btn-outline-secondary btn-sm flex-fill">
                          ✏️ {t('common.edit')}
                        </Link>
                      )}
                      <button className="btn btn-outline-secondary btn-sm flex-fill" type="button" onClick={() => setModal('qr')}>
                        📱 {t('tarantula.qrCode')}
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm flex-fill" onClick={handleExportPdf}>
                        📄 {t('share.exportPdf')}
                      </button>
                      {hasProFeatures ? (
                        <button
                          type="button"
                          className={`btn btn-sm flex-fill ${tarantula.isPublic ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={mayEdit ? handleTogglePublic : undefined}
                          disabled={!mayEdit}
                          title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                          {tarantula.isPublic ? `🌐 ${t('tarantula.publicOn')}` : `🔒 ${t('tarantula.publicOff')}`}
                        </button>
                      ) : (
                        <ProTrialCtaLink
                          className="btn btn-sm flex-fill btn-outline-secondary"
                          style={{ background: 'transparent', color: 'var(--ta-gold)', borderColor: 'var(--ta-border-gold)' }}
                          title={t('pro.publicToggleProOnlyHint')}
                        >
                          {t('pro.publicToggleProOnly')}
                        </ProTrialCtaLink>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm flex-fill btn-outline-secondary"
                        style={{ borderColor: 'var(--ta-border-gold)', color: 'var(--ta-gold)' }}
                        onClick={() => mayEdit && setModal('deceased')}
                        disabled={!mayEdit}
                        title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                        {t('tarantula.markDeceased')}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm flex-fill"
                    onClick={canDeleteSpider ? handleDelete : undefined}
                    disabled={!canDeleteSpider}
                    title={!canDeleteSpider ? t('tarantula.lockedEditHint') : undefined}>
                    🗑️ {t('common.delete')}
                  </button>
                </div>
                <div className="px-3 pb-3 text-center">
                  <Link
                    to="/tools/qr?mode=bulk"
                    className="small text-decoration-none"
                    style={{ color: 'var(--ta-gold)' }}
                    title={t('dashboard.qrBulkPrintTitle')}
                  >
                    {t('tarantula.qrBulkPrintLink')}
                    {!hasProFeatures && (
                      <span className="badge bg-dark ms-1 align-middle" style={{ fontSize: '0.6rem' }}>PRO</span>
                    )}
                  </Link>
                </div>
              </div>
            </FangPanel>
          </div>
        )}

        {detailTab === 'timeline' && (
          <div className="mx-auto ta-parchment-float-wrap ta-parchment-float-wrap--detail ta-parchment-float-wrap--detail-sidebar w-100" style={{ maxWidth: 560 }}>
            <div className="ta-parchment-history ta-parchment-history--tarantula-root w-100">
              <div className="ta-parchment-scroll ta-parchment-scroll--vertical ta-parchment-scroll--as-graphic-shell w-100">
                <img
                  className="ta-parchment-bg-img ta-parchment-bg-img--full"
                  src={publicUrl('parchment-bg.png')}
                  alt=""
                  decoding="async"
                  draggable={false}
                />
                <div className="ta-parchment-scroll-inner ta-parchment-scroll-inner--vertical-detail">
                  <div className="ta-parchment-sheet">
                    <header className="ta-parchment-page-title">
                      <span className="ta-parchment-page-title__icons" aria-hidden>📜</span>
                      <span className="ta-parchment-page-title__text">{t('tarantula.history')}</span>
                    </header>
                    {timeline.length === 0 ? (
                      <p className="small mb-0 ta-parchment-muted text-center">{t('tarantula.historyEmpty')}</p>
                    ) : (
                      <>
                        <div className="ta-parchment-events ta-parchment-events--scroll">
                          {timelinePage.map((event) => (
                            <TimelineItem
                              key={event.id}
                              event={event}
                              onDelete={mayEdit ? handleDeleteEvent : undefined}
                              shareMeta={{ tarantulaName: tarantula.name, speciesName: species?.scientificName, profileUrl: publicProfileUrl }}
                            />
                          ))}
                        </div>
                        {showHistoryPager && (
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 ta-parchment-pager mt-2">
                            <button
                              type="button"
                              className="btn btn-sm ta-parchment-pager__btn"
                              disabled={historyPageSafe <= 0}
                              onClick={() => setHistoryPageIndex((p) => Math.max(0, p - 1))}
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
                              onClick={() => setHistoryPageIndex((p) => Math.min(historyTotalPages - 1, p + 1))}
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
          </div>
        )}

        {detailTab === 'care' && (
          <div className="mx-auto" style={{ maxWidth: 900 }}>
            {species && (
              <ChitinCardFrame className="mb-4 ta-chitin-species-detail">
                <SpeciesProfileCard species={species} tarantula={tarantula} t={t} />
              </ChitinCardFrame>
            )}
            {terrariumRec && (
              <FangPanel className="mb-4 ta-spider-detail-fang">
                <div className="card border-0 shadow-sm ta-premium-pane">
                  <div className="card-body">
                    <div className="ta-section-header mb-3">
                      <span>🏠 {t('terrarium.title')}</span>
                    </div>
                    <p className="small mb-2 text-muted">
                      {t('terrarium.basedOn')} <strong>{tarantula.currentSizeCm} cm</strong>
                      {terrariumRec.adultSizeCmMax && ` · ${t('terrarium.expectedAdult')}: ${terrariumRec.adultSizeCmMax} cm`}
                    </p>
                    <div className="fw-semibold small mb-2">📐 {t(terrariumRec.enclosureI18n.key, terrariumRec.enclosureI18n.params)}</div>
                    {terrariumRec.pct !== null && (
                      <div>
                        <div className="d-flex justify-content-between small text-muted mb-1">
                          <span>{t('terrarium.growthToAdult')}</span>
                          <span>{terrariumRec.pct}%</span>
                        </div>
                        <div className="progress" style={{ height: 6 }}>
                          <div
                            className={`progress-bar ${terrariumRec.pct >= 80 ? 'bg-success' : terrariumRec.pct >= 50 ? 'bg-warning' : 'bg-info'}`}
                            style={{ width: `${terrariumRec.pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="text-muted mb-0 mt-2" style={{ fontSize: '0.7rem' }}>
                      {t('terrarium.estimatedNote')}
                    </p>
                  </div>
                </div>
              </FangPanel>
            )}
            <div className="d-flex gap-2 mb-2 flex-wrap">
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setModal('feeding')} disabled={!mayEdit} title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                {t('tarantula.addFeeding')}
              </button>
              <button
                type="button"
                className="btn btn-outline-purple btn-sm"
                style={{ color: '#6f42c1', borderColor: '#6f42c1' }}
                onClick={() => setModal('molt')}
                disabled={!mayEdit}
                title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                {t('tarantula.addMolt')}
              </button>
              <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => setModal('behavior')} disabled={!mayEdit} title={!mayEdit ? t('tarantula.lockedEditHint') : undefined}>
                {t('tarantula.addBehavior')}
              </button>
            </div>
          </div>
        )}

        {detailTab === 'reminders' && (
          <div className="mx-auto" style={{ maxWidth: 640 }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <p className="small text-muted mb-0">{t('tarantula.remindersForSpiderIntro')}</p>
              <div className="d-flex flex-wrap gap-2 justify-content-end">
                {token && id && (
                  <Link to={remindersPrefillUrl(id)} className="btn btn-sm btn-dark">
                    {t('tarantula.newReminder')}
                  </Link>
                )}
                <Link to="/reminders" className="btn btn-sm btn-outline-secondary">
                  {t('tarantula.remindersManageAll')}
                </Link>
              </div>
            </div>
            {!token ? (
              <p className="small text-muted">{t('tarantula.remindersSignInHint')}</p>
            ) : spiderRemindersUpcoming.length === 0 && spiderRemindersDone.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <div className="fs-3 mb-2">🔔</div>
                <p className="mb-2">{t('tarantula.remindersForSpiderEmpty')}</p>
                {token && id && (
                  <Link to={remindersPrefillUrl(id)} className="btn btn-sm btn-dark">
                    {t('tarantula.newReminder')}
                  </Link>
                )}
              </div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {spiderRemindersUpcoming.length > 0 && (
                  <section>
                    <h3 className="text-uppercase small letter-spacing text-muted mb-2">{t('tarantula.reminderSectionUpcoming')}</h3>
                    <div className="d-flex flex-column gap-2">
                      {spiderRemindersUpcoming.map((r) => {
                        const overdue = reminderOverdue(r.dueDate)
                        const isAutomatic = r.source === 'automatic'
                        const canAct = !r.isDone && (isAutomatic || (r.id && mayEdit))
                        return (
                          <div key={r.id || `${r.type}-${r.dueDate}`} className="card border-0 shadow-sm ta-premium-pane">
                            <div className="card-body py-2 px-3 d-flex align-items-start gap-2" style={{ minWidth: 0 }}>
                              <span className="flex-shrink-0" style={{ fontSize: '1.25rem' }} aria-hidden>
                                {REMINDER_TYPE_ICONS[r.type] ?? '📌'}
                              </span>
                              <div className="flex-grow-1 min-w-0" style={{ minWidth: 0 }}>
                                <div className="fw-semibold small" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                  {r.message || r.type}
                                  {isAutomatic && (
                                    <span className="badge bg-dark ms-1 align-middle" style={{ fontSize: '0.6rem' }}>
                                      PRO
                                    </span>
                                  )}
                                </div>
                                <div className={`small ${overdue ? 'text-danger fw-semibold' : 'text-muted'}`}>
                                  {overdue && '⚠️ '}
                                  {formatDateTimeInUserZone(r.dueDate, i18n.language)}
                                </div>
                              </div>
                              {canAct && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success flex-shrink-0"
                                  style={{ padding: '2px 8px' }}
                                  onClick={() => handleSpiderReminderDone(r)}
                                  title={t('reminders.markDone')}
                                >
                                  ✓
                                </button>
                              )}
                              {!isAutomatic && r.id && mayEdit && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger flex-shrink-0"
                                  style={{ padding: '2px 8px' }}
                                  onClick={() => handleSpiderReminderDelete(r.id)}
                                  title={t('common.delete')}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}
                {spiderRemindersDone.length > 0 && (
                  <section>
                    <h3 className="text-uppercase small letter-spacing text-muted mb-2">{t('tarantula.reminderSectionDone')}</h3>
                    <div className="d-flex flex-column gap-2">
                      {spiderRemindersDone.map((r) => (
                        <div
                          key={r.id || `done-${r.type}-${r.dueDate}`}
                          className="card border-0 shadow-sm ta-premium-pane"
                          style={{ opacity: 0.75 }}
                        >
                          <div className="card-body py-2 px-3 d-flex align-items-start gap-2">
                            <span className="flex-shrink-0 text-success" aria-hidden>
                              ✓
                            </span>
                            <div className="flex-grow-1 min-w-0">
                              <div className="small text-decoration-line-through text-muted" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                {r.message || r.type}
                              </div>
                              <div className="small text-muted">{formatDateTimeInUserZone(r.dueDate, i18n.language)}</div>
                            </div>
                            {r.source !== 'automatic' && r.id && mayEdit && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger flex-shrink-0"
                                style={{ padding: '2px 8px' }}
                                onClick={() => handleSpiderReminderDelete(r.id)}
                                title={t('common.delete')}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {detailTab === 'notes' && (
          <div className="card border-0 shadow-sm ta-premium-pane mx-auto p-4" style={{ maxWidth: 720 }}>
            {tarantula.notes ? (
              <p className="mb-4 text-break" style={{ color: 'var(--ta-parchment, #f5f0e6)', whiteSpace: 'pre-wrap' }}>
                {tarantula.notes}
              </p>
            ) : (
              <p className="text-muted mb-4">{t('tarantula.notesTabEmpty')}</p>
            )}
            {mayEdit ? (
              <Link to={`/tarantulas/${id}/edit`} className="btn btn-sm btn-outline-secondary">
                ✏️ {t('tarantula.notesTabEdit')}
              </Link>
            ) : (
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled title={t('tarantula.lockedEditHint')}>
                ✏️ {t('tarantula.notesTabEdit')}
              </button>
            )}
          </div>
        )}

        {detailTab === 'gallery' && (
          <div className="mx-auto" style={{ maxWidth: 900 }}>
            <PhotoGallery
              tarantulaId={id}
              readOnly={!mayEdit}
              shareMeta={{ tarantulaName: tarantula.name, speciesName: species?.scientificName, profileUrl: publicProfileUrl }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
