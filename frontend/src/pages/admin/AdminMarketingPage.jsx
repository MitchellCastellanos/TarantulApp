import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import marketplaceService from '../../services/marketplaceService'
import { useAuth } from '../../context/AuthContext'
import { buildAdStudioListingSharePng, downloadAdStudioListingSharePng } from '../../utils/adStudioShareAssets'

function downloadCsv(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (val) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function vendorCountry(u) {
  return u?.country || u?.profileCountry || u?.profile?.country || ''
}

function vendorActiveListings(u) {
  const totals = u?.marketplaceListingTotals
  if (totals && typeof totals.active === 'number') return totals.active
  if (totals && typeof totals.all === 'number') return totals.all
  return 0
}

function vendorSoldCount(u) {
  return u?.marketplaceListingTotals?.sold ?? 0
}

function AdStudioDraftCard({ draft, t, onCopy }) {
  const [cardPreview, setCardPreview] = useState(null)
  const [cardLoading, setCardLoading] = useState(true)
  const [cardError, setCardError] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!draft?.listingId) {
      setCardLoading(false)
      return undefined
    }
    setCardLoading(true)
    setCardError(false)
    buildAdStudioListingSharePng(draft.listingId, t)
      .then((dataUrl) => {
        if (!cancelled) setCardPreview(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setCardError(true)
      })
      .finally(() => {
        if (!cancelled) setCardLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [draft?.listingId, t])

  const downloadImage = async () => {
    if (!draft?.listingId) return
    setImgBusy(true)
    try {
      await downloadAdStudioListingSharePng(draft.listingId, draft.adTitle || draft.title, t)
    } finally {
      setImgBusy(false)
    }
  }

  return (
    <div className="border rounded p-2 mb-2">
      <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
        <div className="small">
          <strong>{draft.title || draft.speciesName || 'Draft'}</strong>
          {' · '}
          {draft.source || 'unknown'}
          {' · '}
          {draft.channel}
          {draft.copyMode ? ` · ${draft.copyMode}` : ''}
        </div>
        <div className="d-flex gap-1 flex-wrap">
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onCopy(draft.text)}>
            Copy all
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={imgBusy || cardLoading || cardError}
            onClick={downloadImage}
          >
            {imgBusy ? 'Downloading…' : 'Download share image'}
          </button>
        </div>
      </div>
      <div className="row g-2">
        <div className="col-12 col-lg-7">
          <label className="form-label small text-muted mb-0">Ad title (Kijiji / FB)</label>
          <textarea className="form-control form-control-sm mb-2" rows={2} value={draft.adTitle || ''} readOnly />
          <label className="form-label small text-muted mb-0">Description</label>
          <textarea className="form-control form-control-sm" rows={8} value={draft.adDescription || draft.text || ''} readOnly />
        </div>
        <div className="col-12 col-lg-5">
          <label className="form-label small text-muted mb-0">Listing photo (share card)</label>
          <div className="border rounded bg-light d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
            {cardLoading ? (
              <span className="small text-muted p-3">Loading preview…</span>
            ) : cardError ? (
              <span className="small text-danger p-3">Could not build share image.</span>
            ) : cardPreview ? (
              <img src={cardPreview} alt="" className="img-fluid rounded" style={{ maxHeight: 280 }} />
            ) : null}
          </div>
          <p className="small text-muted mt-1 mb-0">
            Same branded PNG as listing share — use this as the marketplace listing photo.
          </p>
        </div>
      </div>
    </div>
  )
}

function groupByCountry(items, key = vendorCountry) {
  const map = new Map()
  for (const it of items) {
    const c = (key(it) || '').toUpperCase() || 'XX'
    map.set(c, (map.get(c) || 0) + 1)
  }
  return [...map.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
}

export default function AdminMarketingPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const isAdmin = user?.admin === true
  const isMarketingOps = user?.marketingOps === true
  const marketingLite = isMarketingOps && !isAdmin
  const [summary, setSummary] = useState(null)
  const [vendors, setVendors] = useState([])
  const [totalVendors, setTotalVendors] = useState(0)
  const [totalPendingInvites, setTotalPendingInvites] = useState(0)
  const [betaStats, setBetaStats] = useState(null)
  const [officialVendors, setOfficialVendors] = useState([])
  const [officialLeads, setOfficialLeads] = useState([])
  const [tapRate, setTapRate] = useState(null)
  const [listingCounts, setListingCounts] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyVendorId, setBusyVendorId] = useState(null)
  const [newsletterTitle, setNewsletterTitle] = useState('')
  const [listingQuery, setListingQuery] = useState('')
  const [listingOptions, setListingOptions] = useState([])
  const [selectedListingIds, setSelectedListingIds] = useState([])
  const [newsletterDraft, setNewsletterDraft] = useState(null)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [newsletterBusy, setNewsletterBusy] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [liveTopVendors, setLiveTopVendors] = useState([])
  const [adTemplates, setAdTemplates] = useState({ channels: [], tones: [], templates: [] })
  const [adSearch, setAdSearch] = useState('')
  const [adStorefront, setAdStorefront] = useState('monarch')
  const [adSource, setAdSource] = useState('all')
  const [adListings, setAdListings] = useState([])
  const [selectedAdListingIds, setSelectedAdListingIds] = useState([])
  const [adChannel, setAdChannel] = useState('kijiji')
  const [adTone, setAdTone] = useState('collector')
  const [adTemplateKey, setAdTemplateKey] = useState('inventory_push')
  const [adCityHint, setAdCityHint] = useState('')
  const [adCopyMode, setAdCopyMode] = useState('listing')
  const [adDrafts, setAdDrafts] = useState([])
  const [adBusy, setAdBusy] = useState(false)
  const [marketingEmail, setMarketingEmail] = useState('')
  const [marketingDisplayName, setMarketingDisplayName] = useState('')
  const [marketingLookup, setMarketingLookup] = useState(null)
  const [marketingUserNotFound, setMarketingUserNotFound] = useState(false)
  const [marketingLookupBusy, setMarketingLookupBusy] = useState(false)
  const [marketingToggleBusy, setMarketingToggleBusy] = useState(false)
  const [marketingProvisionBusy, setMarketingProvisionBusy] = useState(false)

  const reload = () => {
    setLoading(true)
    const tasks = marketingLite
      ? [adminService.adStudioTemplates().catch(() => ({ channels: [], tones: [], templates: [] }))]
      : [
          adminService.summary(),
          adminService.vendorUsers(500, true),
          adminService.betaStats().catch(() => null),
          adminService.officialVendors().catch(() => []),
          adminService.officialVendorLeads().catch(() => []),
          adminService.tapToContactRate().catch(() => null),
          adminService.listingCounts().catch(() => null),
          adminService.newsletterSubscriberCount().catch(() => ({ count: 0 })),
          adminService.liveTopVendors(3).catch(() => []),
          adminService.adStudioTemplates().catch(() => ({ channels: [], tones: [], templates: [] })),
        ]
    Promise.all(tasks)
      .then(([s, vendorsPack, beta, partners, leads, rate, counts, subs, topVendors, templates]) => {
        if (marketingLite) {
          const onlyTemplates = s && typeof s === 'object' ? s : { channels: [], tones: [], templates: [] }
          setAdTemplates(onlyTemplates)
          return
        }
        setSummary(s)
        setVendors(Array.isArray(vendorsPack?.users) ? vendorsPack.users : [])
        setTotalVendors(typeof vendorsPack?.totalVendors === 'number' ? vendorsPack.totalVendors : 0)
        setTotalPendingInvites(
          typeof vendorsPack?.totalPendingInvites === 'number' ? vendorsPack.totalPendingInvites : 0,
        )
        setBetaStats(beta && typeof beta === 'object' ? beta : null)
        setOfficialVendors(Array.isArray(partners) ? partners : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
        setTapRate(rate && typeof rate === 'object' ? rate : null)
        setListingCounts(counts && typeof counts === 'object' ? counts : null)
        setSubscriberCount(typeof subs?.count === 'number' ? subs.count : 0)
        setLiveTopVendors(Array.isArray(topVendors) ? topVendors : [])
        setAdTemplates(templates && typeof templates === 'object'
          ? templates
          : { channels: [], tones: [], templates: [] })
      })
      .catch((err) => {
        const code = err?.response?.status
        setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingLite])

  const verifiedCount = useMemo(() => vendors.filter((v) => v.verifiedBreeder).length, [vendors])
  const verifiableQueue = useMemo(
    () => vendors.filter((v) => !v.verifiedBreeder && vendorActiveListings(v) > 0).slice(0, 50),
    [vendors],
  )
  const vendorsByCountry = useMemo(() => groupByCountry(vendors), [vendors])
  const partnersByCountry = useMemo(
    () =>
      groupByCountry(
        officialVendors.map((p) => ({ country: p?.country })),
        (it) => it.country,
      ),
    [officialVendors],
  )
  const betaByCountry = useMemo(() => {
    const rows = Array.isArray(betaStats?.byCountry) ? betaStats.byCountry : []
    return rows
      .map((row) => ({ country: (row.country || 'XX').toUpperCase(), count: row.total ?? 0 }))
      .sort((a, b) => b.count - a.count)
  }, [betaStats])

  const totalActiveListings = useMemo(
    () => vendors.reduce((sum, v) => sum + vendorActiveListings(v), 0),
    [vendors],
  )

  const handleToggleVerified = async (user) => {
    setBusyVendorId(user.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.setUserVerifiedBreeder(user.id, !user.verifiedBreeder)
      setVendors((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...updated, verifiedBreeder: updated.verifiedBreeder } : u)),
      )
      setSuccess(t('admin.mkt.verifiedToggleSuccess'))
    } catch {
      setError(t('admin.mkt.verifiedToggleError'))
    } finally {
      setBusyVendorId(null)
    }
  }

  const exportVendorsCsv = () => {
    const rows = vendors.map((u) => ({
      email: u.email || '',
      handle: u.publicHandle || '',
      country: vendorCountry(u) || '',
      verified: u.verifiedBreeder ? 'yes' : 'no',
      listings_active: vendorActiveListings(u),
      listings_sold: vendorSoldCount(u),
      plan: u.plan || 'FREE',
      in_trial: u.inTrial ? 'yes' : 'no',
      last_activity: u.lastActivityAt || '',
    }))
    if (rows.length === 0) {
      setError(t('admin.mkt.exportEmpty'))
      return
    }
    downloadCsv(`tarantulapp-vendors-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const exportPartnerLeadsCsv = () => {
    const rows = officialLeads.map((l) => ({
      business: l.businessName || '',
      contact: l.contactName || '',
      email: l.contactEmail || '',
      city: l.city || '',
      state: l.state || '',
      country: l.country || '',
      created_at: l.createdAt || '',
    }))
    if (rows.length === 0) {
      setError(t('admin.mkt.exportEmpty'))
      return
    }
    downloadCsv(`tarantulapp-partner-leads-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  useEffect(() => {
    const q = listingQuery.trim()
    if (q.length < 2) {
      setListingOptions([])
      return
    }
    let cancelled = false
    marketplaceService.listPublic({ q, status: 'active' }).then((rows) => {
      if (!cancelled) setListingOptions(Array.isArray(rows) ? rows.slice(0, 20) : [])
    })
    return () => {
      cancelled = true
    }
  }, [listingQuery])

  useEffect(() => {
    const fromListingId = searchParams.get('listingId') || undefined
    let cancelled = false
    setAdBusy(true)
    adminService
      .adStudioListings({
        q: adSearch || undefined,
        source: adSource || undefined,
        storefront: adStorefront || undefined,
        listingId: fromListingId,
        limit: 60,
      })
      .then((rows) => {
        if (cancelled) return
        const list = Array.isArray(rows) ? rows : []
        setAdListings(list)
        setSelectedAdListingIds((prev) => prev.filter((id) => list.some((x) => x.id === id)))
      })
      .catch(() => {
        if (cancelled) return
        setAdListings([])
      })
      .finally(() => {
        if (!cancelled) setAdBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [adSearch, adSource, adStorefront, searchParams])

  useEffect(() => {
    const fromListing = searchParams.get('listingId')
    if (!fromListing || adListings.length === 0) return
    const exists = adListings.some((l) => String(l.id) === String(fromListing))
    if (exists) {
      setSelectedAdListingIds((prev) => (prev.includes(fromListing) ? prev : [...prev, fromListing]))
    }
  }, [searchParams, adListings])

  const toggleListingSelection = (id) => {
    setSelectedListingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const createNewsletterDraft = async () => {
    if (selectedListingIds.length === 0) {
      setError(t('admin.mkt.newsletterNeedListings'))
      return
    }
    setNewsletterBusy(true)
    setError('')
    try {
      const draft = await adminService.createNewsletterDraft({
        title: newsletterTitle || t('admin.mkt.dropsTitle'),
        listingIds: selectedListingIds,
      })
      setNewsletterDraft(draft)
      setSuccess(t('admin.mkt.newsletterDraftSaved'))
    } catch (e) {
      setError(e?.response?.data?.message || t('admin.mkt.newsletterDraftError'))
    } finally {
      setNewsletterBusy(false)
    }
  }

  const toggleAdListingSelection = (id) => {
    setSelectedAdListingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const generateAds = async () => {
    if (selectedAdListingIds.length === 0) {
      setError('Select at least one listing for Ad Studio.')
      return
    }
    setAdBusy(true)
    setError('')
    try {
      const out = await adminService.adStudioGenerate({
        channel: adChannel,
        tone: adTone,
        templateKey: adTemplateKey,
        cityHint: adCityHint || undefined,
        copyMode: adCopyMode,
        listingIds: selectedAdListingIds,
      })
      const rows = Array.isArray(out?.ads) ? out.ads : []
      setAdDrafts(rows)
      setSuccess(`Generated ${rows.length} ad drafts.`)
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to generate ads right now.')
    } finally {
      setAdBusy(false)
    }
  }

  const copyAdDraft = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '')
      setSuccess('Ad text copied to clipboard.')
    } catch {
      setError('Could not copy text from browser.')
    }
  }

  const exportAdDraftsCsv = () => {
    if (!Array.isArray(adDrafts) || adDrafts.length === 0) {
      setError('No ad drafts to export yet.')
      return
    }
    const rows = adDrafts.map((d) => ({
      listing_id: d.listingId || '',
      source: d.source || '',
      title: d.title || '',
      ad_title: d.adTitle || '',
      ad_description: d.adDescription || '',
      species: d.speciesName || '',
      seller: d.sellerName || '',
      channel: d.channel || '',
      tone: d.tone || '',
      template: d.templateKey || '',
      copy_mode: d.copyMode || '',
      listing_url: d.listingUrl || '',
      store_url: d.storeUrl || '',
      text: d.text || '',
    }))
    downloadCsv(`tarantulapp-ad-studio-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const addListingFromDropdown = (id) => {
    if (!id) return
    setSelectedAdListingIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const lookupMarketingUser = async () => {
    const email = marketingEmail.trim()
    if (!email) {
      setError('Enter an email first.')
      return
    }
    setMarketingLookupBusy(true)
    setError('')
    setSuccess('')
    setMarketingUserNotFound(false)
    try {
      const out = await adminService.userLookupByEmail(email)
      if (!out?.found) {
        setMarketingLookup(null)
        setMarketingUserNotFound(true)
        return
      }
      setMarketingLookup(out.user)
      setMarketingUserNotFound(false)
      setSuccess('User loaded.')
    } catch {
      setError('Could not lookup user.')
    } finally {
      setMarketingLookupBusy(false)
    }
  }

  const provisionMarketingTeam = async () => {
    const email = marketingEmail.trim()
    if (!email) {
      setError('Enter an email first.')
      return
    }
    if (!window.confirm(`Create or update marketing access for ${email} and send the welcome email?`)) return
    setMarketingProvisionBusy(true)
    setError('')
    setSuccess('')
    try {
      const out = await adminService.provisionMarketingTeamMember({
        email,
        displayName: marketingDisplayName.trim() || undefined,
        sendWelcomeEmail: true,
        resetPassword: true,
      })
      if (out?.user) {
        setMarketingLookup(out.user)
        setMarketingUserNotFound(false)
      }
      const created = out?.created ? 'Account created. ' : ''
      const welcome = out?.welcomeEmailSent ? 'Welcome email sent.' : ''
      const pwd = out?.plainPassword ? ` Temp password (also emailed): ${out.plainPassword}` : ''
      setSuccess(`${created}${welcome}${pwd}`.trim())
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not provision marketing team member.')
    } finally {
      setMarketingProvisionBusy(false)
    }
  }

  const toggleMarketingOps = async (next) => {
    if (!marketingLookup?.id) return
    setMarketingToggleBusy(true)
    setError('')
    try {
      const updated = await adminService.setUserMarketingOps(marketingLookup.id, next)
      setMarketingLookup((prev) => ({ ...prev, marketingOps: updated?.marketingOps === true }))
      setSuccess(next ? 'Marketing access granted.' : 'Marketing access removed.')
    } catch {
      setError('Could not update marketing access.')
    } finally {
      setMarketingToggleBusy(false)
    }
  }

  const sendNewsletter = async () => {
    if (!newsletterDraft?.id) return
    if (!window.confirm(t('admin.mkt.newsletterSendConfirm', { count: subscriberCount }))) return
    setNewsletterBusy(true)
    setError('')
    try {
      const result = await adminService.sendNewsletterDraft(newsletterDraft.id)
      setSuccess(t('admin.mkt.newsletterSent', { sent: result?.sent ?? 0 }))
      setNewsletterDraft(null)
      setSelectedListingIds([])
    } catch (e) {
      setError(e?.response?.data?.message || t('admin.mkt.newsletterSendError'))
    } finally {
      setNewsletterBusy(false)
    }
  }

  return (
    <div>
      <h2 className="h5 mb-1">{t('admin.mkt.title')}</h2>
      <p className="small text-muted mb-3">{t('admin.mkt.blurb')}</p>
      {marketingLite && (
        <div className="alert alert-info small py-2">
          Marketing role mode: Ad Studio + Partner Outreach access only. Use{' '}
          <Link to="/admin/partner-outreach">Partner Outreach</Link> for lead operations.
        </div>
      )}

      {error && <div className="alert alert-danger small py-2">{error}</div>}
      {success && <div className="alert alert-success small py-2">{success}</div>}

      {loading && <p className="small text-muted">{t('admin.loading')}</p>}

      {!marketingLite && summary && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardUsers')}</small>
              <div className="h5 mb-0">{summary.usersTotal}</div>
              <small className="text-muted">{t('admin.mkt.cardUsers7d', { n: summary.usersLast7d ?? 0 })}</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardVendors')}</small>
              <div className="h5 mb-0">{totalVendors}</div>
              <small className="text-muted">
                {t('admin.mkt.cardVendorsVerified', { n: verifiedCount })} · {t('admin.mkt.cardVendorsPending', { n: totalPendingInvites })}
              </small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardListings')}</small>
              <div className="h5 mb-0">{listingCounts?.total ?? totalActiveListings}</div>
              <small className="text-muted">
                {t('admin.mkt.cardListingsBreakdown', {
                  peer: listingCounts?.peerActive ?? totalActiveListings,
                  partner: listingCounts?.partnerActive ?? 0,
                })}
              </small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardTarantulas')}</small>
              <div className="h5 mb-0">{summary.tarantulasTotal}</div>
              <small className="text-muted">{t('admin.mkt.cardTarantulasBlurb')}</small>
            </div>
          </div>
        </div>
      )}

      {!marketingLite && tapRate && (
        <div className="card p-3 mb-4">
          <h3 className="h6 mb-1">{t('admin.mkt.northMetricTitle')}</h3>
          <p className="small text-muted mb-3">{t('admin.mkt.northMetricBlurb')}</p>
          <div className="row g-2">
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricViews7d')}</div>
                <div className="h6 mb-0">{tapRate.views7d ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricTaps7d')}</div>
                <div className="h6 mb-0">{tapRate.contactTaps7d ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricRate7d')}</div>
                <div className="h6 mb-0">
                  {Math.round(((tapRate.contactTapRate7d ?? 0) * 100) * 10) / 10}%
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricRate30d')}</div>
                <div className="h6 mb-0">
                  {Math.round(((tapRate.contactTapRate30d ?? 0) * 100) * 10) / 10}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!marketingLite && <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
              <div>
                <h3 className="h6 mb-0">{t('admin.mkt.vendorsByCountryTitle')}</h3>
                <small className="text-muted">{t('admin.mkt.vendorsByCountryBlurb')}</small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportVendorsCsv}>
                {t('admin.mkt.exportCsv')}
              </button>
            </div>
            {vendorsByCountry.length === 0 ? (
              <p className="small text-muted mb-0">{t('admin.mkt.noData')}</p>
            ) : (
              <table className="table table-sm align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>{t('admin.mkt.colCountry')}</th>
                    <th className="text-end">{t('admin.mkt.colVendors')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorsByCountry.map((row) => (
                    <tr key={row.country}>
                      <td>{row.country === 'XX' ? t('admin.mkt.countryUnknown') : row.country}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <h3 className="h6 mb-0">{t('admin.mkt.betaByCountryTitle')}</h3>
            <small className="text-muted">{t('admin.mkt.betaByCountryBlurb')}</small>
            {betaByCountry.length === 0 ? (
              <p className="small text-muted mb-0 mt-2">{t('admin.mkt.noData')}</p>
            ) : (
              <table className="table table-sm align-middle mb-0 small mt-2">
                <thead>
                  <tr>
                    <th>{t('admin.mkt.colCountry')}</th>
                    <th className="text-end">{t('admin.mkt.colSignups')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaByCountry.slice(0, 15).map((row) => (
                    <tr key={row.country}>
                      <td>{row.country === 'XX' ? t('admin.mkt.countryUnknown') : row.country}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <h3 className="h6 mb-0">{t('admin.mkt.partnersByCountryTitle')}</h3>
            <small className="text-muted">{t('admin.mkt.partnersByCountryBlurb')}</small>
            {partnersByCountry.length === 0 ? (
              <p className="small text-muted mb-0 mt-2">{t('admin.mkt.noData')}</p>
            ) : (
              <table className="table table-sm align-middle mb-0 small mt-2">
                <thead>
                  <tr>
                    <th>{t('admin.mkt.colCountry')}</th>
                    <th className="text-end">{t('admin.mkt.colPartners')}</th>
                  </tr>
                </thead>
                <tbody>
                  {partnersByCountry.map((row) => (
                    <tr key={row.country}>
                      <td>{row.country === 'XX' ? t('admin.mkt.countryUnknown') : row.country}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
              <div>
                <h3 className="h6 mb-0">{t('admin.mkt.partnerLeadsTitle')}</h3>
                <small className="text-muted">{t('admin.mkt.partnerLeadsBlurb')}</small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportPartnerLeadsCsv}>
                {t('admin.mkt.exportCsv')}
              </button>
            </div>
            {officialLeads.length === 0 ? (
              <p className="small text-muted mb-0">{t('admin.mkt.noLeads')}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 small">
                  <thead>
                    <tr>
                      <th>{t('admin.mkt.colBusiness')}</th>
                      <th>{t('admin.mkt.colCountry')}</th>
                      <th>{t('admin.mkt.colContact')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialLeads.slice(0, 20).map((l, idx) => (
                      <tr key={`${l.contactEmail || idx}`}>
                        <td className="text-nowrap">{l.businessName || '—'}</td>
                        <td>{l.country || '—'}</td>
                        <td className="text-nowrap small text-muted">{l.contactEmail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>}

      {!marketingLite && <div className="card p-3 mb-4">
        <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
          <div>
            <h3 className="h6 mb-0">{t('admin.mkt.verifyQueueTitle')}</h3>
            <small className="text-muted">{t('admin.mkt.verifyQueueBlurb')}</small>
          </div>
          <span className="badge bg-secondary align-self-center">
            {t('admin.mkt.verifyQueueCount', { n: verifiableQueue.length })}
          </span>
        </div>
        {verifiableQueue.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.mkt.verifyQueueEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 small">
              <thead>
                <tr>
                  <th>{t('auth.email')}</th>
                  <th>{t('admin.vendorsHandle')}</th>
                  <th className="text-end">{t('admin.vendorsColListings')}</th>
                  <th className="text-end">{t('admin.vendorsColSold')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {verifiableQueue.map((u) => (
                  <tr key={u.id}>
                    <td className="text-nowrap">{u.email}</td>
                    <td>{u.publicHandle || '—'}</td>
                    <td className="text-end">{vendorActiveListings(u)}</td>
                    <td className="text-end">{vendorSoldCount(u)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-dark"
                        disabled={busyVendorId === u.id}
                        onClick={() => handleToggleVerified(u)}
                      >
                        {busyVendorId === u.id ? t('common.saving') : t('admin.mkt.markVerified')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      <div className="card p-3 mb-4">
        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
          <div>
            <h3 className="h6 mb-0">Ad Studio</h3>
            <small className="text-muted">
              Listing or storefront copy from live data, plus the same share-card image used on marketplace posts.
            </small>
          </div>
          <span className="badge bg-dark">Monarch-ready</span>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-12 col-md-4">
            <input
              className="form-control form-control-sm"
              value={adStorefront}
              onChange={(e) => setAdStorefront(e.target.value)}
              placeholder="Storefront filter (e.g. monarch)"
            />
          </div>
          <div className="col-12 col-md-4">
            <input
              className="form-control form-control-sm"
              value={adSearch}
              onChange={(e) => setAdSearch(e.target.value)}
              placeholder="Search listing/species"
            />
          </div>
          <div className="col-12 col-md-4">
            <select className="form-select form-select-sm" value={adSource} onChange={(e) => setAdSource(e.target.value)}>
              <option value="all">All sources</option>
              <option value="peer">Direct TarantulApp</option>
              <option value="partner">Mirror / Partner</option>
            </select>
          </div>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-12 col-md-7">
            <select className="form-select form-select-sm" value="" onChange={(e) => addListingFromDropdown(e.target.value)}>
              <option value="">Quick add listing to selection...</option>
              {adListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {(l.title || l.speciesName || 'Listing')} · {l.source === 'partner' ? 'mirror' : 'direct'}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-5">
            <div className="small text-muted border rounded p-2">
              Selected: {selectedAdListingIds.length}
            </div>
          </div>
        </div>
        <div className="border rounded p-2 mb-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
          {adBusy && adListings.length === 0 ? (
            <div className="small text-muted">Loading listings...</div>
          ) : adListings.length === 0 ? (
            <div className="small text-muted">No listings found for current filters.</div>
          ) : (
            adListings.map((l) => (
              <label key={l.id} className="d-flex align-items-start gap-2 small mb-1">
                <input
                  type="checkbox"
                  checked={selectedAdListingIds.includes(l.id)}
                  onChange={() => toggleAdListingSelection(l.id)}
                />
                <span>
                  <strong>{l.title || l.speciesName || 'Listing'}</strong>
                  {' · '}
                  <span className="text-muted">{l.source === 'partner' ? 'mirror' : 'direct'}</span>
                  {l.sellerName ? ` · ${l.sellerName}` : ''}
                  {l.city ? ` · ${l.city}` : ''}
                </span>
              </label>
            ))
          )}
        </div>
        <div className="row g-2 mb-2">
          <div className="col-12 col-md-2">
            <select className="form-select form-select-sm" value={adCopyMode} onChange={(e) => setAdCopyMode(e.target.value)}>
              {(adTemplates.copyModes?.length ? adTemplates.copyModes : [
                { key: 'listing', label: 'Listing details' },
                { key: 'storefront', label: 'Storefront / shop' },
              ]).map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <select className="form-select form-select-sm" value={adChannel} onChange={(e) => setAdChannel(e.target.value)}>
              {(adTemplates.channels?.length ? adTemplates.channels : [{ key: 'kijiji', label: 'Kijiji' }]).map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2">
            <select className="form-select form-select-sm" value={adTone} onChange={(e) => setAdTone(e.target.value)}>
              {(adTemplates.tones?.length ? adTemplates.tones : [{ key: 'collector', label: 'Collector' }]).map((tone) => (
                <option key={tone.key} value={tone.key}>{tone.label}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <select
              className="form-select form-select-sm"
              value={adTemplateKey}
              onChange={(e) => setAdTemplateKey(e.target.value)}
            >
              {(adTemplates.templates?.length ? adTemplates.templates : [{ key: 'inventory_push', label: 'Inventory push' }]).map((tpl) => (
                <option key={tpl.key} value={tpl.key}>{tpl.label}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-3">
            <input
              className="form-control form-control-sm"
              value={adCityHint}
              onChange={(e) => setAdCityHint(e.target.value)}
              placeholder="City hint (listing mode)"
            />
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 mb-2">
          <button type="button" className="btn btn-sm btn-dark" disabled={adBusy} onClick={generateAds}>
            {adBusy ? 'Generating...' : `Generate ads (${selectedAdListingIds.length})`}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={adDrafts.length === 0}
            onClick={exportAdDraftsCsv}
          >
            Export drafts CSV
          </button>
        </div>
        {adDrafts.length > 0 && (
          <div className="border rounded p-2" style={{ maxHeight: 720, overflowY: 'auto' }}>
            {adDrafts.map((d) => (
              <AdStudioDraftCard key={`${d.listingId}-${d.channel}-${d.copyMode}`} draft={d} t={t} onCopy={copyAdDraft} />
            ))}
          </div>
        )}
      </div>

      {!marketingLite && <div className="card p-3 mb-4">
        <h3 className="h6 mb-1">{t('admin.mkt.dropsTitle')}</h3>
        <p className="small text-muted mb-2">
          {t('admin.mkt.newsletterSubscribers', { count: subscriberCount })}
        </p>
        <input
          className="form-control form-control-sm mb-2"
          value={newsletterTitle}
          onChange={(e) => setNewsletterTitle(e.target.value)}
          placeholder={t('admin.mkt.newsletterTitlePlaceholder')}
        />
        <input
          className="form-control form-control-sm mb-2"
          value={listingQuery}
          onChange={(e) => setListingQuery(e.target.value)}
          placeholder={t('admin.mkt.newsletterSearchPlaceholder')}
        />
        <div className="border rounded p-2 mb-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
          {listingOptions.map((l) => (
            <label key={l.id} className="d-flex align-items-start gap-2 small mb-1">
              <input
                type="checkbox"
                checked={selectedListingIds.includes(l.id)}
                onChange={() => toggleListingSelection(l.id)}
              />
              <span>{l.title} {l.speciesName ? `· ${l.speciesName}` : ''}</span>
            </label>
          ))}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-outline-dark" disabled={newsletterBusy} onClick={createNewsletterDraft}>
            {newsletterBusy ? t('common.saving') : t('admin.mkt.newsletterPreview')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={newsletterBusy || !newsletterDraft?.id}
            onClick={() => setShowPreview(true)}
          >
            {t('admin.mkt.newsletterOpenPreview')}
          </button>
          <button type="button" className="btn btn-sm btn-warning" disabled={newsletterBusy || !newsletterDraft?.id} onClick={sendNewsletter}>
            {t('admin.mkt.newsletterSend')}
          </button>
        </div>
      </div>}

      {!marketingLite && showPreview && newsletterDraft?.bodyHtml && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)' }} role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title h6">{newsletterDraft.title}</h4>
                <button type="button" className="btn-close" onClick={() => setShowPreview(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="small text-muted">{t('admin.mkt.newsletterPreviewHint')}</p>
                <div dangerouslySetInnerHTML={{ __html: newsletterDraft.bodyHtml }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {!marketingLite && <div className="card p-3">
        <h3 className="h6 mb-1">{t('admin.mkt.topVendorsLiveTitle')}</h3>
        <p className="small text-muted mb-2">{t('admin.mkt.topVendorsLiveBlurb')}</p>
        {liveTopVendors.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.mkt.topVendorsLiveEmpty')}</p>
        ) : (
          <ul className="small mb-0">
            {liveTopVendors.map((v) => {
              const name = v.storefrontName || v.displayName || v.handle || 'Vendor'
              const ratePct = Math.round((v.contactTapRate ?? 0) * 1000) / 10
              return (
                <li key={v.userId}>
                  {t('admin.mkt.topVendorsLiveRank', { rank: v.rank ?? '?' })}{' '}
                  <strong>{name}</strong>
                  {' — '}
                  {t('admin.mkt.topVendorsLiveRate', { rate: ratePct, views: v.views30d ?? 0 })}
                </li>
              )
            })}
          </ul>
        )}
      </div>}

      {isAdmin && (
        <div className="card p-3 mt-4">
          <h3 className="h6 mb-1">Marketing Ops Access</h3>
          <p className="small text-muted mb-2">
            Grant limited access to Ad Studio and Partner Outreach without full admin rights.
          </p>
          <div className="row g-2 mb-2">
            <div className="col-12 col-md-5">
              <input
                className="form-control form-control-sm"
                value={marketingEmail}
                onChange={(e) => {
                  setMarketingEmail(e.target.value)
                  setMarketingUserNotFound(false)
                }}
                placeholder="user@email.com"
              />
            </div>
            <div className="col-12 col-md-4">
              <input
                className="form-control form-control-sm"
                value={marketingDisplayName}
                onChange={(e) => setMarketingDisplayName(e.target.value)}
                placeholder="Display name (optional)"
              />
            </div>
            <div className="col-12 col-md-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-dark w-100"
                disabled={marketingLookupBusy}
                onClick={lookupMarketingUser}
              >
                {marketingLookupBusy ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
          {marketingUserNotFound && (
            <div className="border rounded p-2 small mb-2">
              <p className="mb-2 text-muted">No account with that email. Create one, grant marketing access, and send the English welcome email.</p>
              <button
                type="button"
                className="btn btn-sm btn-success"
                disabled={marketingProvisionBusy}
                onClick={provisionMarketingTeam}
              >
                {marketingProvisionBusy ? 'Provisioning…' : 'Create account & send welcome'}
              </button>
            </div>
          )}
          {marketingLookup && (
            <div className="border rounded p-2 small">
              <div><strong>{marketingLookup.email}</strong></div>
              <div className="text-muted mb-2">
                {marketingLookup.displayName || marketingLookup.publicHandle || 'No display name'} · marketingOps:{' '}
                {marketingLookup.marketingOps ? 'yes' : 'no'}
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  disabled={marketingToggleBusy}
                  onClick={() => toggleMarketingOps(true)}
                >
                  Grant marketing access
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={marketingToggleBusy}
                  onClick={() => toggleMarketingOps(false)}
                >
                  Revoke marketing access
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  disabled={marketingProvisionBusy}
                  onClick={provisionMarketingTeam}
                >
                  {marketingProvisionBusy ? 'Sending…' : 'Reset password & resend welcome'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
