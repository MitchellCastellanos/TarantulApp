import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import ChitinCardFrame from '../components/ChitinCardFrame'
import { usePageSeo } from '../hooks/usePageSeo'
import { useAuth } from '../context/AuthContext'
import sexIdCaseService from '../services/sexIdCaseService'
import referralService from '../services/referralService'
import { imgUrl } from '../services/api'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CHOICES = ['MALE', 'FEMALE', 'UNCERTAIN']

export default function SexIdCasePublicPage() {
  const { t } = useTranslation()
  const { caseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [voting, setVoting] = useState(false)
  const [referral, setReferral] = useState(null)
  const [msg, setMsg] = useState('')

  const refParam = (searchParams.get('ref') || '').trim()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shareBase = useMemo(() => {
    if (!data?.id || !origin) return ''
    return `${origin}/sex-id/${data.id}`
  }, [data?.id, origin])

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
    imageUrl: data?.imageUrl ? imgUrl(data.imageUrl) : origin ? `${origin}/icon-512.png` : undefined,
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
    } catch {
      setMsg(shareUrl)
    }
  }

  if (!caseId || !UUID_REGEX.test(caseId)) {
    return (
      <div>
        <Navbar />
        <div className="container py-4 text-center text-muted small">{t('sexIdCase.notFound')}</div>
      </div>
    )
  }

  if (err && !data) {
    return (
      <div>
        <Navbar />
        <div className="container py-4 text-center text-muted small">{err}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <Navbar />
        <div className="container py-4 text-center text-muted small">{t('sexIdCase.loading')}</div>
      </div>
    )
  }

  const imageSrc = imgUrl(data.imageUrl)
  const totals = data.totals || {}
  const pct = data.percentages || {}
  const totalVotes = data.totalVotes ?? 0
  const ai = data.aiOpinion || {}
  const community = data.communityOpinion || {}
  const finalOpinion = data.finalOpinion || {}

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 640 }}>
        <ChitinCardFrame showSilhouettes={false}>
          <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
            <div className="card-body py-3 px-3 px-md-4">
              <h1 className="h5 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>
                {data.title?.trim() ? data.title : t('sexIdCase.headingFallback')}
              </h1>
              {data.speciesHint ? (
                <p className="small text-muted mb-2">{data.speciesHint}</p>
              ) : null}
              <p className="small mb-3" style={{ color: 'var(--ta-text-muted)' }}>
                {t('sexIdCase.authorLine', { name: data.authorDisplayName || 'keeper' })}
              </p>
              {imageSrc ? (
                <div className="mb-3 text-center">
                  <img
                    src={imageSrc}
                    alt=""
                    className="img-fluid rounded"
                    style={{ maxHeight: 360, objectFit: 'contain' }}
                  />
                </div>
              ) : null}

              {msg && <div className="alert alert-success small py-2">{msg}</div>}
              {err && <div className="alert alert-danger small py-2">{err}</div>}

              <h2 className="h6 fw-bold mt-2" style={{ color: 'var(--ta-gold)' }}>
                {t('sexIdCase.aiTitle')}
              </h2>
              <p className="small mb-1" style={{ color: 'var(--ta-text-muted)' }}>
                Esto piensa <BrandName />: estimación basada en nuestro propio algoritmo (no reemplaza una confirmación experta).
              </p>
              <p className="small mb-1" style={{ color: 'var(--ta-text)' }}>
                {ai.message || t('sexIdCase.aiFallback')}
              </p>
              <p className="small text-muted mb-1">
                {t('sexIdCase.aiConfidenceLabel', { level: ai.confidenceLabel || 'medium' })}
              </p>
              <p className="small text-muted mb-3">{ai.explanation || ''}</p>

              <h2 className="h6 fw-bold mt-2" style={{ color: 'var(--ta-gold)' }}>
                {t('sexIdCase.communityTitle')}
              </h2>
              <p className="small text-muted mb-2">
                {community.leadingChoice
                  ? t('sexIdCase.communityLine', {
                      p: Math.round((Math.max(community.maleProbability || 0, community.femaleProbability || 0, community.uncertainProbability || 0)) * 100),
                      choice: t(`sexIdCase.choice.${String(community.leadingChoice).toLowerCase()}`),
                      count: community.rawVotes ?? totalVotes,
                    })
                  : t('sexIdCase.totalVotes', { count: totalVotes })}
              </p>
              {CHOICES.map((key) => {
                const n = totals[key] ?? 0
                const p = pct[key] ?? 0
                return (
                  <div key={key} className="mb-2">
                    <div className="d-flex justify-content-between small">
                      <span>{t(`sexIdCase.choice.${key.toLowerCase()}`)}</span>
                      <span className="text-muted">
                        {n} ({p}%)
                      </span>
                    </div>
                    <div
                      className="rounded-1"
                      style={{
                        height: 8,
                        background: 'rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        border: '1px solid var(--ta-border)',
                      }}
                    >
                      <div
                        style={{
                          width: `${p}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--ta-gold), #a06020)',
                          minWidth: p > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                  </div>
                )
              })}

              <h2 className="h6 fw-bold mt-3" style={{ color: 'var(--ta-gold)' }}>
                {t('sexIdCase.finalTitle')}
              </h2>
              <p className="small mb-2" style={{ color: 'var(--ta-text)' }}>
                {finalOpinion.leadingChoice
                  ? t('sexIdCase.finalLine', {
                      p: finalOpinion.scorePercent ?? 0,
                      choice: t(`sexIdCase.choice.${String(finalOpinion.leadingChoice).toLowerCase()}`),
                      confidence: finalOpinion.confidenceLabel || 'medium',
                    })
                  : t('sexIdCase.finalPending')}
              </p>

              {isAuthor && (
                <p className="small text-muted mt-3 mb-0">{t('sexIdCase.authorNoVote')}</p>
              )}

              {canVote && (
                <div className="mt-3">
                  <p className="small fw-semibold mb-2" style={{ color: 'var(--ta-parchment)' }}>
                    {data.myChoice
                      ? t('sexIdCase.yourPickChange', { choice: t(`sexIdCase.choice.${String(data.myChoice).toLowerCase()}`) })
                      : t('sexIdCase.yourPick')}
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {CHOICES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`btn btn-sm ${data.myChoice === c ? 'btn-outline-light' : 'btn-dark'}`}
                        disabled={voting}
                        onClick={() => onVote(c)}
                      >
                        {t(`sexIdCase.choice.${c.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!user && (
                <div className="mt-3 p-2 rounded-2" style={{ border: '1px solid var(--ta-border)' }}>
                  <p className="small mb-2" style={{ color: 'var(--ta-text)' }}>
                    {t('sexIdCase.loginToVote')}
                  </p>
                  <Link
                    to={loginTo}
                    state={loginState}
                    className="btn btn-sm btn-dark"
                  >
                    {t('nav.login')}
                  </Link>
                </div>
              )}

              <div className="mt-4 pt-3 border-top border-secondary border-opacity-25">
                <p className="small fw-semibold mb-2" style={{ color: 'var(--ta-gold)' }}>
                  {t('sexIdCase.shareCta')}
                </p>
                <p className="small text-muted mb-2">{t('sexIdCase.moreVotesBetter')}</p>
                {shareUrl ? (
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={copyShare}>
                      {t('sexIdCase.copyLink')}
                    </button>
                    <Link className="btn btn-sm btn-dark" to="/community?tab=invite">
                      {t('sexIdCase.inviteKeepers')}
                    </Link>
                    <code className="small user-select-all text-break" style={{ color: 'var(--ta-text-muted)' }}>
                      {shareUrl}
                    </code>
                  </div>
                ) : null}
                {token && !referral?.code && (
                  <p className="small text-muted mt-2 mb-0">{t('sexIdCase.refHint')}</p>
                )}
              </div>
            </div>
          </div>
        </ChitinCardFrame>
        <p className="text-center small mt-3">
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => navigate(-1)}>
            {t('sexIdCase.back')}
          </button>
        </p>
      </div>
    </div>
  )
}
