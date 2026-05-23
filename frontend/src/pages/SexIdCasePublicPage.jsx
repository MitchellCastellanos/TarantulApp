import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { usePageSeo } from '../hooks/usePageSeo'
import { socialOgImageUrl } from '../constants/socialOg'
import { useAuth } from '../context/AuthContext'
import sexIdCaseService from '../services/sexIdCaseService'
import referralService from '../services/referralService'
import { imgUrl } from '../services/api'
import './SexIdCasePublicPage.css'
import { resolvePublicFrontOrigin } from '../utils/publicFrontBaseUrl'
import { keeperProfileKeys } from '../query/keeperProfileKeys.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CHOICES = ['MALE', 'FEMALE', 'UNCERTAIN']

/** Map API enum → i18n key under sexIdCase.choice.* */
function choiceI18nKey(raw) {
  const u = String(raw || '').toUpperCase()
  if (u === 'MALE') return 'male'
  if (u === 'FEMALE') return 'female'
  if (u === 'UNCERTAIN') return 'uncertain'
  const f = String(raw || '').trim().toLowerCase()
  return f || 'uncertain'
}

function translateConfidenceBand(t, raw) {
  let k = String(raw == null ? 'medium' : raw).trim().toLowerCase().replace(/\s+/g, '_')
  if (!['low', 'medium', 'high'].includes(k)) k = 'medium'
  return t(`sexIdCase.confidenceLevel.${k}`)
}

function initialsFromName(name) {
  const s = String(name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  }
  return s.slice(0, 2).toUpperCase()
}

function timeAgoShort(iso, t) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.max(1, Math.floor(diff / 60000))
  if (min < 60) return t('sexIdCase.timeMinutesAgo', { n: min })
  const hr = Math.floor(min / 60)
  if (hr < 24) return t('sexIdCase.timeHoursAgo', { n: hr })
  const day = Math.floor(hr / 24)
  return t('sexIdCase.timeDaysAgo', { n: day })
}

function formatVotingEnds(iso, t) {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return t('sexIdCase.votingEnded')
  const totalH = Math.floor(ms / 3600000)
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  if (d > 0) return t('sexIdCase.endsInDaysHours', { d, h })
  if (totalH > 0) return t('sexIdCase.endsInHours', { h: totalH })
  const m = Math.max(1, Math.floor(ms / 60000))
  return t('sexIdCase.endsInMinutes', { m })
}

export default function SexIdCasePublicPage() {
  const { t } = useTranslation()
  const { caseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, token } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [voting, setVoting] = useState(false)
  const [referral, setReferral] = useState(null)
  const [msg, setMsg] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const refParam = (searchParams.get('ref') || '').trim()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicOrigin = resolvePublicFrontOrigin()
  const shareBase = useMemo(() => {
    if (!data?.id) return ''
    return `${publicOrigin}/sex-id/${data.id}`
  }, [data?.id, publicOrigin])

  const shareUrl = useMemo(() => {
    if (!shareBase) return ''
    const code = (referral?.code || refParam || '').trim()
    if (code) return `${shareBase}?ref=${encodeURIComponent(code)}`
    return shareBase
  }, [shareBase, referral?.code, refParam])

  usePageSeo({
    title: data
      ? t('sexIdCase.seoTitle', { title: data.title || t('sexIdCase.defaultCaseTitle') })
      : t('sexIdCase.pageTitle'),
    description: t('sexIdCase.metaDescription'),
    imageUrl: data?.imageUrl ? imgUrl(data.imageUrl) : socialOgImageUrl(origin),
    noindex: false,
  })

  const load = useCallback(() => {
    if (!caseId || !UUID_REGEX.test(caseId)) {
      setErr(t('sexIdCase.notFound'))
      setData(null)
      return
    }
    setErr('')
    sexIdCaseService
      .getPublic(caseId)
      .then(setData)
      .catch(() => {
        setData(null)
        setErr(t('sexIdCase.notFound'))
      })
  }, [caseId, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!token) {
      setReferral(null)
      return
    }
    referralService
      .me()
      .then(setReferral)
      .catch(() => setReferral(null))
  }, [token, user?.id])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [menuOpen])

  const isAuthor = data && user?.id && String(data.authorUserId) === String(user.id)
  const canVote = data && user && !isAuthor

  const loginTo = useMemo(() => {
    const r = (refParam || referral?.code || '').trim()
    return { pathname: '/login', search: r ? `?ref=${encodeURIComponent(r)}` : '' }
  }, [refParam, referral?.code])

  const loginState = useMemo(
    () => ({ redirectAfterAuth: `/sex-id/${caseId}${refParam ? `?ref=${encodeURIComponent(refParam)}` : ''}` }),
    [caseId, refParam]
  )

  const onVote = async (choice) => {
    if (!data?.id || !user) return
    setVoting(true)
    setErr('')
    try {
      const next = await sexIdCaseService.vote(data.id, choice)
      setData(next)
      setMsg(t('sexIdCase.voteSaved'))
      queryClient.invalidateQueries({ queryKey: keeperProfileKeys.all })
    } catch (e) {
      setErr(e?.response?.data?.error || t('sexIdCase.voteError'))
    } finally {
      setVoting(false)
    }
  }

  const copyShare = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMsg(t('sexIdCase.copiedLink'))
      setMenuOpen(false)
    } catch {
      setMsg(shareUrl)
    }
  }

  const onShareNative = async () => {
    if (!shareUrl) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('sexIdCase.shareNativeTitle'),
          url: shareUrl,
        })
      } catch {
        /* user cancelled */
      }
      return
    }
    await copyShare()
  }

  const stageLabel = (stage) => {
    if (!stage) return ''
    const k = String(stage).toLowerCase()
    if (k === 'sling') return t('sexIdCase.stageSling')
    if (k === 'juvenile') return t('sexIdCase.stageJuvenile')
    if (k === 'adult') return t('sexIdCase.stageAdult')
    return stage
  }

  const statusBadgeKey = (d) => {
    const s = String(d?.status || 'OPEN')
    if (s === 'RESOLVED') return t('sexIdCase.statusResolved')
    if (s === 'EXPIRED') return t('sexIdCase.statusExpired')
    if (s === 'LOCKED') return t('sexIdCase.statusLocked')
    return t('sexIdCase.statusActive')
  }

  if (!caseId || !UUID_REGEX.test(caseId)) {
    return (
      <div className="ta-sid-page">
        <Navbar />
        <div className="container py-4 text-center small" style={{ color: 'var(--sid-muted, #9ca3af)' }}>
          {t('sexIdCase.notFound')}
        </div>
      </div>
    )
  }

  if (err && !data) {
    return (
      <div className="ta-sid-page">
        <Navbar />
        <div className="container py-4 text-center small" style={{ color: 'var(--sid-muted, #9ca3af)' }}>
          {err}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="ta-sid-page">
        <Navbar />
        <div className="container py-4 text-center small" style={{ color: 'var(--sid-muted, #9ca3af)' }}>
          {t('sexIdCase.loading')}
        </div>
      </div>
    )
  }

  const imageSrc = imgUrl(data.imageUrl)
  const totals = data.totals || {}
  const pct = data.percentages || {}
  const totalVotes = data.totalVotes ?? 0
  const tm = Number(totals.MALE ?? 0)
  const tf = Number(totals.FEMALE ?? 0)
  const tu = Number(totals.UNCERTAIN ?? 0)
  const sumBin = tm + tf
  const malePctBinary = sumBin > 0 ? Math.round((100 * tm) / sumBin) : 50
  const femalePctBinary = 100 - malePctBinary
  const ringDeg = `${(malePctBinary / 100) * 360}deg`

  const ai = data.aiOpinion || {}
  const finalOpinion = data.finalOpinion || {}

  const primaryTitle =
    (data.title && String(data.title).trim()) ||
    (data.speciesHint && String(data.speciesHint).trim()) ||
    t('sexIdCase.headingFallback')

  const subParts = []
  if (data.stage) subParts.push(stageLabel(data.stage))
  const imgType = data.imageType === 'exuvia' ? t('sexIdCase.imageTypeExuvia') : t('sexIdCase.imageTypeVentral')
  subParts.push(imgType)
  const subtitleLine = subParts.join(' \u2022 ')

  const displayName = data.authorDisplayName || 'keeper'
  const authorInitials = initialsFromName(displayName)

  return (
    <div className="ta-sid-page">
      <Navbar />
      <div className="container px-3 px-sm-4" style={{ maxWidth: 480 }}>
        <header className="ta-sid-toolbar">
          <button type="button" className="ta-sid-toolbar__btn" aria-label={t('sexIdCase.back')} onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left fs-5" aria-hidden="true" />
          </button>
          <h1 className="ta-sid-toolbar__title mb-0">{t('sexIdCase.screenTitle')}</h1>
          <div className="ta-sid-toolbar__actions">
            <button type="button" className="ta-sid-toolbar__btn" aria-label={t('sexIdCase.shareNative')} onClick={onShareNative}>
              <i className="bi bi-share-fill" aria-hidden="true" />
            </button>
            <div className="ta-sid-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="ta-sid-toolbar__btn"
                aria-expanded={menuOpen}
                aria-label={t('sexIdCase.moreMenu')}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <i className="bi bi-three-dots" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div className="ta-sid-dropdown">
                  <button type="button" onClick={copyShare}>
                    {t('sexIdCase.copyLink')}
                  </button>
                  <Link to="/community?tab=invite" onClick={() => setMenuOpen(false)}>
                    {t('sexIdCase.inviteKeepers')}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {msg ? <div className="alert alert-success ta-sid-alert py-2 small">{msg}</div> : null}
        {err ? <div className="alert alert-danger ta-sid-alert py-2 small">{err}</div> : null}

        <p className="ta-sid-section-label mb-0">{t('sexIdCase.sectionCase')}</p>
        <div className="ta-sid-card ta-sid-card--accent">
          <div className="ta-sid-summary">
            {imageSrc ? (
              <div className="ta-sid-summary__thumb">
                <img src={imageSrc} alt="" />
              </div>
            ) : (
              <div className="ta-sid-summary__thumb d-flex align-items-center justify-content-center">
                <i className="bi bi-image text-secondary" aria-hidden="true" />
              </div>
            )}
            <div>
              <h2 className="ta-sid-summary__title">{primaryTitle}</h2>
              {subtitleLine ? <p className="ta-sid-summary__sub mb-0">{subtitleLine}</p> : null}
              <div className="ta-sid-summary__author mt-1">
                <span className="ta-sid-avatar" aria-hidden="true">
                  {authorInitials}
                </span>
                <span>{t('sexIdCase.caseBy', { name: displayName })}</span>
                {data.createdAt ? (
                  <span className="ms-1 opacity-75">&middot; {timeAgoShort(data.createdAt, t)}</span>
                ) : null}
              </div>
            </div>
            <div className="ta-sid-meta-row">
              <span className="ta-sid-badge">{statusBadgeKey(data)}</span>
              {data.votingClosesAt ? (
                <span className="ta-sid-meta-muted">
                  <i className="bi bi-clock" aria-hidden="true" />
                  {formatVotingEnds(data.votingClosesAt, t)}
                </span>
              ) : null}
              <span className="ta-sid-meta-muted ms-sm-auto">{t('sexIdCase.votesCountLabel', { n: totalVotes })}</span>
            </div>
          </div>

          {imageSrc ? (
            <div className="ta-sid-gallery">
              <div className="ta-sid-gallery__cell" style={{ flex: '1 1 auto', maxWidth: '100%' }}>
                <img src={imageSrc} alt="" />
              </div>
            </div>
          ) : null}

          {shareUrl ? (
            <div className="ta-sid-link-row">
              <i className="bi bi-link-45deg ta-sid-link-row__icon" aria-hidden="true" />
              <div className="flex-grow-1 min-w-0">
                <div className="small text-muted mb-0">{t('sexIdCase.publicLinkLabel')}</div>
                <div className="ta-sid-link-row__url">{shareUrl.replace(/^https?:\/\//, '')}</div>
              </div>
              <button type="button" className="ta-sid-btn-outline flex-shrink-0" onClick={copyShare}>
                {t('sexIdCase.copyLink')}
              </button>
            </div>
          ) : null}
        </div>

        <div className="ta-sid-warn">
          <i className="bi bi-exclamation-triangle-fill ta-sid-warn__icon" aria-hidden="true" />
          <div>
            <p className="ta-sid-warn__title">{t('sexIdCase.shareWarningTitle')}</p>
            <p className="ta-sid-warn__body">{t('sexIdCase.shareWarningBody')}</p>
          </div>
        </div>

        <p className="ta-sid-guidelines-head ta-sid-guidelines-head--good mb-0">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          {t('sexIdCase.goodToShareTitle')}
        </p>
        <div className="mb-3">
          {['g1', 'g2', 'g3'].map((key) => (
            <div key={key} className="ta-sid-guideline-row">
              <div className="ta-sid-guideline-thumb">
                <i className={`bi ${key === 'g1' ? 'bi-camera' : key === 'g2' ? 'bi-rulers' : 'bi-brightness-high'}`} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="ta-sid-guideline-row__title">{t(`sexIdCase.guidelineGood.${key}Title`)}</p>
                <p className="ta-sid-guideline-row__desc">{t(`sexIdCase.guidelineGood.${key}Desc`)}</p>
              </div>
              <i className="bi bi-check-circle-fill text-success fs-5" aria-hidden="true" />
            </div>
          ))}
        </div>

        <p className="ta-sid-guidelines-head ta-sid-guidelines-head--bad mb-0">
          <i className="bi bi-x-circle-fill" aria-hidden="true" />
          {t('sexIdCase.avoidSharingTitle')}
        </p>
        <div className="mb-4">
          {['b1', 'b2', 'b3'].map((key) => (
            <div key={key} className="ta-sid-guideline-row">
              <div className="ta-sid-guideline-thumb">
                <i className={`bi ${key === 'b1' ? 'bi-hand-index' : key === 'b2' ? 'bi-geo-alt' : 'bi-exclamation-octagon'}`} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="ta-sid-guideline-row__title">{t(`sexIdCase.guidelineBad.${key}Title`)}</p>
                <p className="ta-sid-guideline-row__desc">{t(`sexIdCase.guidelineBad.${key}Desc`)}</p>
              </div>
              <i className="bi bi-x-lg text-danger fs-6" aria-hidden="true" />
            </div>
          ))}
        </div>

        <p className="ta-sid-section-label mb-0">{t('sexIdCase.sectionVotes')}</p>
        <div className="ta-sid-card">
          <div className="ta-sid-votes">
            <div className="ta-sid-votes__side ta-sid-votes__side--male">
              <span className="ta-sid-votes__symbol" aria-hidden="true">
                &#9794;
              </span>
              <span className="ta-sid-votes__pct">{malePctBinary}%</span>
              <span className="ta-sid-votes__label">{t('sexIdCase.choiceShort.male')}</span>
            </div>
            <div className="ta-sid-votes__ring-wrap">
              <div className="ta-sid-votes__ring" style={{ '--sid-male-deg': ringDeg }}>
                <div className="ta-sid-votes__ring-inner">
                  <span className="ta-sid-votes__ring-num">{totalVotes}</span>
                  <span className="ta-sid-votes__ring-sub">{t('sexIdCase.votesWord')}</span>
                </div>
              </div>
            </div>
            <div className="ta-sid-votes__side ta-sid-votes__side--female">
              <span className="ta-sid-votes__symbol" aria-hidden="true">
                &#9792;
              </span>
              <span className="ta-sid-votes__pct">{femalePctBinary}%</span>
              <span className="ta-sid-votes__label">{t('sexIdCase.choiceShort.female')}</span>
            </div>
          </div>
          {tu > 0 ? (
            <p className="ta-sid-uncertain-note mb-0">
              {t('sexIdCase.uncertainShareNote', { pct: pct.UNCERTAIN ?? 0, n: tu })}
            </p>
          ) : null}
        </div>

        {isAuthor ? <p className="small mt-2" style={{ color: 'var(--sid-muted, #9ca3af)' }}>{t('sexIdCase.authorNoVote')}</p> : null}

        {canVote ? (
          <div className="ta-sid-card mt-3">
            <p className="small fw-semibold mb-2" style={{ color: 'var(--sid-text, #f4f4f8)' }}>
              {data.myChoice
                ? t('sexIdCase.yourPickChange', { choice: t(`sexIdCase.choice.${choiceI18nKey(data.myChoice)}`) })
                : t('sexIdCase.yourPick')}
            </p>
            <div className="ta-sid-vote-btns">
              {CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`btn btn-sm ${data.myChoice === c ? 'btn-outline-light' : 'btn-dark'}`}
                  disabled={voting}
                  onClick={() => onVote(c)}
                >
                  {t(`sexIdCase.choice.${choiceI18nKey(c)}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!user ? (
          <div className="ta-sid-card mt-3">
            <p className="small mb-2" style={{ color: 'var(--sid-muted, #9ca3af)' }}>
              {t('sexIdCase.loginToVote')}
            </p>
            <Link to={loginTo} state={loginState} className="btn btn-sm ta-sid-btn-outline">
              {t('nav.login')}
            </Link>
          </div>
        ) : null}

        <details className="ta-sid-details ta-sid-card mt-3">
          <summary>{t('sexIdCase.detailsToggle')}</summary>
          <div className="ta-sid-details__body">
            <p className="mb-1 fw-semibold" style={{ color: 'var(--sid-purple, #b565f8)' }}>
              {t('sexIdCase.aiTitle')} (<BrandName />)
            </p>
            <p className="mb-2">{ai.message || t('sexIdCase.aiFallback')}</p>
            <p className="mb-1 small">{t('sexIdCase.aiConfidenceLabel', { level: translateConfidenceBand(t, ai.confidenceLabel) })}</p>
            {ai.explanation ? <p className="mb-3 small">{ai.explanation}</p> : null}
            <p className="mb-1 fw-semibold" style={{ color: 'var(--sid-purple, #b565f8)' }}>
              {t('sexIdCase.finalTitle')}
            </p>
            <p className="mb-0">
              {finalOpinion.leadingChoice
                ? t('sexIdCase.finalLine', {
                    p: finalOpinion.scorePercent ?? 0,
                    choice: t(`sexIdCase.choice.${choiceI18nKey(finalOpinion.leadingChoice)}`),
                    confidence: translateConfidenceBand(t, finalOpinion.confidenceLabel),
                  })
                : t('sexIdCase.finalPending')}
            </p>
          </div>
        </details>

        <div className="ta-sid-card ta-sid-card--accent mt-3">
          <div className="ta-sid-badge-card">
            <div className="ta-sid-badge-card__icon" aria-hidden="true">
              <i className="bi bi-award-fill" />
            </div>
            <p className="ta-sid-badge-card__text mb-0">
              <Trans i18nKey="sexIdCase.badgeBlurb" components={{ 1: <span className="ta-sid-purple-inline" /> }} />
            </p>
          </div>
        </div>

        <div className="ta-sid-card mt-3">
          <p className="ta-sid-section-label mb-2">{t('sexIdCase.commentsSection')}</p>
          <p className="small mb-0" style={{ color: 'var(--sid-muted, #9ca3af)' }}>
            {t('sexIdCase.commentsEmpty')}
          </p>
          <button type="button" className="ta-sid-btn-outline ta-sid-btn-outline--block" disabled>
            {t('sexIdCase.viewAllComments')}
          </button>
        </div>

        {token && !referral?.code ? (
          <p className="small mt-3 mb-0 px-1" style={{ color: 'var(--sid-muted, #9ca3af)' }}>
            {t('sexIdCase.refHint')}
          </p>
        ) : null}

        <div className="ta-sid-footer-back">
          <button type="button" onClick={() => navigate(-1)}>
            {t('sexIdCase.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
