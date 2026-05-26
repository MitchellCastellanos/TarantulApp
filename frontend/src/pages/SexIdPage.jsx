import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import BrandLogoMark from '../components/BrandLogoMark'
import { usePageSeo } from '../hooks/usePageSeo'
import sexIdCaseService from '../services/sexIdCaseService'
import marketplaceService from '../services/marketplaceService'
import referralService from '../services/referralService'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = { title: '', speciesHint: '', imageUrl: '', imageType: 'ventral', stage: '' }

export default function SexIdPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const navigate = useNavigate()

  usePageSeo({
    title: t('sexIdCase.formTitle'),
    description: t('sexIdCase.formHint'),
  })

  const [publicCases, setPublicCases] = useState({ content: [] })
  const [myCases, setMyCases] = useState({ content: [] })
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const loadPublicCases = useCallback(async () => {
    const data = await sexIdCaseService.listPublic(0, 24)
    setPublicCases(data || { content: [] })
  }, [])

  const loadMyCases = useCallback(async () => {
    const data = await sexIdCaseService.mine(0, 30)
    setMyCases(data || { content: [] })
  }, [])

  useEffect(() => {
    loadPublicCases().catch(() => setErr(t('sexIdCase.loadCasesError')))
  }, [loadPublicCases, t])

  useEffect(() => {
    if (!token) return
    loadMyCases().catch(() => setErr(t('sexIdCase.loadCasesError')))
  }, [token, loadMyCases, t])

  const onPhoto = async (e) => {
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/sex-id' } })
      return
    }
    const f = e.target.files?.[0]
    if (!f) return
    setErr('')
    setUploading(true)
    try {
      const r = await marketplaceService.uploadListingImage(f)
      if (r?.imageUrl) setForm((s) => ({ ...s, imageUrl: r.imageUrl }))
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    } finally {
      setUploading(false)
    }
  }

  const submitCase = async (e) => {
    e.preventDefault()
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/sex-id' } })
      return
    }
    setErr('')
    setMsg('')
    const imageUrl = (form.imageUrl || '').trim()
    if (!imageUrl) {
      setErr(t('sexIdCase.formHint'))
      return
    }
    try {
      const row = await sexIdCaseService.create({
        title: form.title.trim() || undefined,
        imageUrl,
        speciesHint: form.speciesHint.trim() || undefined,
        imageType: form.imageType || 'ventral',
        stage: form.stage || undefined,
      })
      setMsg(t('sexIdCase.caseCreated'))
      setForm(EMPTY_FORM)
      await loadMyCases()
      const refCode = (await referralService.me().catch(() => null))?.code
      const ref = refCode ? `?ref=${encodeURIComponent(refCode)}` : ''
      navigate(`/sex-id/${row.id}${ref}`)
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const renderCaseRow = (c) => (
    <div
      key={c.id}
      className="d-flex flex-wrap align-items-center justify-content-between gap-2 rounded-3 p-2 mb-2"
      style={{ border: '1px solid var(--ta-border)' }}
    >
      <div className="small" style={{ color: 'var(--ta-text)' }}>
        {(c.title && c.title.trim()) || t('sexIdCase.headingFallback')}
        <span className="text-muted ms-1">{' ? '}{t('sexIdCase.voteTally', { n: c.totalVotes ?? 0 })}</span>
      </div>
      <Link className="btn btn-sm btn-outline-secondary" to={`/sex-id/${c.id}`}>
        {t('sexIdCase.openCase')}
      </Link>
    </div>
  )

  const publicList = publicCases.content || []
  const myList = myCases.content || []

  return (
    <>
      <Navbar />
      <div className="container mt-4 mb-5 ta-premium-shell" style={{ maxWidth: 960 }}>
        <header className="ta-social-hub-hero mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-center gap-3 text-center text-sm-start">
            <BrandLogoMark size={56} showIntro className="flex-shrink-0" />
            <div className="flex-grow-1">
              <h1 className="h4 fw-bold mb-1" style={{ color: 'var(--ta-parchment)' }}>
                {t('sexIdCase.formTitle')}
              </h1>
              <p className="mb-0 small" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>
                {t('sexIdCase.formHint')}
              </p>
            </div>
          </div>
        </header>

        {err && <div className="alert alert-danger small py-2">{err}</div>}
        {msg && <div className="alert alert-success small py-2">{msg}</div>}

        {!token && (
          <div className="alert alert-info small py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span>{t('social.communityOpenBanner', 'Browse public cases. Log in to post your own.')}</span>
            <button
              type="button"
              className="btn btn-sm btn-dark"
              onClick={() => navigate('/login', { state: { redirectAfterAuth: '/sex-id' } })}
            >
              {t('social.loginToParticipate', 'Log in')}
            </button>
          </div>
        )}

        <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>
          {t('sexIdCase.publicCasesTitle', 'Public Sex ID cases')}
        </h2>
        {publicList.length === 0 ? (
          <p className="text-muted small">{t('social.noActiveCases')}</p>
        ) : (
          publicList.map(renderCaseRow)
        )}

        <ChitinCardFrame showSilhouettes={false} variant="auth" className="mb-4 mt-3">
          <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
            <div className="card-body py-3 px-3 px-md-4">
              <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{t('sexIdCase.formTitle')}</h2>
              <p className="small text-muted mb-3" style={{ lineHeight: 1.55 }}>{t('sexIdCase.formHint')}</p>
              <form onSubmit={submitCase} className="small">
                <div className="mb-2">
                  <label className="form-label small mb-0">{t('sexIdCase.fieldTitle')}</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t('sexIdCase.fieldTitlePh')}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-0">{t('sexIdCase.fieldImageType')}</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.imageType}
                    onChange={(e) => setForm((f) => ({ ...f, imageType: e.target.value }))}
                  >
                    <option value="ventral">{t('sexIdCase.imageTypeVentral')}</option>
                    <option value="exuvia">{t('sexIdCase.imageTypeExuvia')}</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-0">{t('sexIdCase.fieldSpecies')}</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.speciesHint}
                    onChange={(e) => setForm((f) => ({ ...f, speciesHint: e.target.value }))}
                    placeholder={t('sexIdCase.fieldSpeciesPh')}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-0">{t('sexIdCase.fieldStage')}</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.stage}
                    onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                  >
                    <option value="">{t('sexIdCase.stageOptional')}</option>
                    <option value="sling">{t('stages.sling')}</option>
                    <option value="juvenile">{t('stages.juvenile')}</option>
                    <option value="adult">{t('stages.adult')}</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-0">{t('sexIdCase.uploadPhoto')}</label>
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="image/*"
                    disabled={uploading}
                    onChange={onPhoto}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small mb-0">{t('sexIdCase.imageUrl')}</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="/uploads/?"
                  />
                </div>
                <button type="submit" className="btn btn-sm btn-dark" disabled={uploading}>
                  {t('sexIdCase.create')}
                </button>
              </form>
            </div>
          </div>
        </ChitinCardFrame>

        {token && (
          <>
            <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>{t('sexIdCase.myCases')}</h2>
            {myList.length === 0 ? (
              <p className="text-muted small">{t('sexIdCase.myCasesEmpty')}</p>
            ) : (
              myList.map(renderCaseRow)
            )}
          </>
        )}
      </div>
    </>
  )
}
