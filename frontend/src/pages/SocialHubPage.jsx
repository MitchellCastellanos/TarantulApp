import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePageSeo } from '../hooks/usePageSeo'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import BrandLogoMark from '../components/BrandLogoMark'
import communityService from '../services/communityService'
import chatService from '../services/chatService'
import userPublicService from '../services/userPublicService'
import tarantulaService from '../services/tarantulaService'
import referralService from '../services/referralService'
import sexIdCaseService from '../services/sexIdCaseService'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { useAuth } from '../context/AuthContext'

const TAB_FEED = 'feed'
const TAB_SPOOD = 'spood'
const TAB_SEX_ID = 'sexId'
const TAB_INVITE = 'invite'

/** UUID v4 (case-insensitive). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function SocialHubPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(TAB_FEED)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const [feed, setFeed] = useState({ content: [], number: 0, totalPages: 0 })
  const [mine, setMine] = useState({ content: [], number: 0, totalPages: 0 })
  const [composer, setComposer] = useState({
    body: '',
    visibility: 'public',
    milestoneKind: '',
    imageUrl: '',
    tarantulaId: '',
  })
  const [composerOpen, setComposerOpen] = useState(false)
  const [myTarantulas, setMyTarantulas] = useState([])
  const [expanded, setExpanded] = useState({})
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDraft, setCommentDraft] = useState({})

  const [threads, setThreads] = useState({ content: [] })
  const [otherUserHandle, setOtherUserHandle] = useState('')
  const [profileSuggestions, setProfileSuggestions] = useState([])
  const [searchingProfiles, setSearchingProfiles] = useState(false)
  const [activeThread, setActiveThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState({ content: [] })
  const [spoodBody, setSpoodBody] = useState('')

  const [referral, setReferral] = useState(null)

  const [sexIdForm, setSexIdForm] = useState({
    title: '',
    speciesHint: '',
    imageUrl: '',
    imageType: 'ventral',
    stage: '',
  })
  const [sexIdCases, setSexIdCases] = useState({ content: [], number: 0, totalPages: 0 })
  const [sexIdUploading, setSexIdUploading] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('social.seoTitle'),
    description: t('social.metaDescription'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    noindex: true,
  })

  const inviteLink = useMemo(() => {
    if (!referral?.code) return ''
    const base = `${window.location.origin}/login`
    return `${base}?ref=${encodeURIComponent(referral.code)}`
  }, [referral?.code])

  const loadFeed = useCallback(async () => {
    const data = await communityService.publicFeed(0, 30)
    setFeed(data)
  }, [])

  const loadMine = useCallback(async () => {
    const data = await communityService.myPosts(0, 30)
    setMine(data)
  }, [])

  const loadThreads = useCallback(async () => {
    const data = await chatService.threads(0, 30)
    setThreads(data)
  }, [])

  const resolveOtherUserId = useCallback(async (raw) => {
    const s = raw.trim()
    if (!s) return null
    const handle = s.startsWith('@') ? s.slice(1).trim() : s
    if (!handle) return null
    try {
      const row = await userPublicService.byHandle(handle)
      return row?.id || null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (tab !== TAB_SPOOD) return undefined
    const q = otherUserHandle.trim()
    if (q.length < 2) {
      setProfileSuggestions([])
      setSearchingProfiles(false)
      return undefined
    }
    const timer = setTimeout(() => {
      setSearchingProfiles(true)
      userPublicService.search(q, 8)
        .then((rows) => setProfileSuggestions(Array.isArray(rows) ? rows : []))
        .catch(() => setProfileSuggestions([]))
        .finally(() => setSearchingProfiles(false))
    }, 220)
    return () => clearTimeout(timer)
  }, [otherUserHandle, tab])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'sexId') {
      setTab(TAB_SEX_ID)
    }
    const openSeller = searchParams.get('openSeller')
    const openListing = searchParams.get('openListing')
    if (tabParam !== 'spood' || !openSeller?.trim() || !user?.id) return

    const sellerId = openSeller.trim()
    if (String(user.id) === sellerId) {
      navigate('/comunidad', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      setErr('')
      setMsg('')
      try {
        const listingId =
          openListing && UUID_REGEX.test(String(openListing).trim())
            ? String(openListing).trim()
            : null
        const row = await chatService.openThread(sellerId, listingId)
        if (cancelled) return
        setTab(TAB_SPOOD)
        setActiveThread(row)
        const msgs = await chatService.messages(row.id, 0, 50)
        if (!cancelled) setThreadMessages(msgs)
        await loadThreads()
        setMsg(listingId ? t('social.threadOpenedListing') : t('social.threadOpened'))
      } catch (e2) {
        if (!cancelled) {
          setTab(TAB_SPOOD)
          setErr(e2?.response?.data?.error || t('social.saveError'))
        }
      } finally {
        if (!cancelled) navigate('/comunidad', { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, user?.id, navigate, t, loadThreads])

  const loadReferral = useCallback(async () => {
    const data = await referralService.me()
    setReferral(data)
  }, [])

  const loadSexIdCases = useCallback(async () => {
    const data = await sexIdCaseService.mine(0, 30)
    setSexIdCases(data)
  }, [])

  useEffect(() => {
    loadFeed().catch(() => setErr(t('social.loadError')))
  }, [loadFeed, t])

  useEffect(() => {
    if (tab === TAB_FEED) {
      loadMine().catch(() => {})
      if (user?.id) {
        tarantulaService.getAll().then(setMyTarantulas).catch(() => setMyTarantulas([]))
      }
    }
    if (tab === TAB_SPOOD) {
      loadThreads().catch(() => setErr(t('social.loadError')))
    }
    if (tab === TAB_INVITE) {
      loadReferral().catch(() => setErr(t('social.loadError')))
    }
    if (tab === TAB_SEX_ID) {
      loadReferral().catch(() => {})
      if (user?.id) {
        loadSexIdCases().catch(() => setErr(t('sexIdCase.loadCasesError')))
      }
    }
  }, [tab, loadMine, loadThreads, loadReferral, loadSexIdCases, t, user?.id])

  const submitPost = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    try {
      const tid = (composer.tarantulaId || '').trim()
      await communityService.createPost({
        body: composer.body.trim(),
        visibility: composer.visibility,
        milestoneKind: composer.milestoneKind.trim() || undefined,
        imageUrl: composer.imageUrl.trim() || undefined,
        tarantulaId: tid && UUID_REGEX.test(tid) ? tid : undefined,
      })
      setComposer((c) => ({ ...c, body: '', milestoneKind: '', imageUrl: '', tarantulaId: '' }))
      setMsg(t('social.postCreated'))
      await Promise.all([loadFeed(), loadMine()])
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const onToggleLike = async (postId) => {
    setErr('')
    try {
      const updated = await communityService.toggleLike(postId)
      const merge = (list) =>
        (list || []).map((p) => (p.id === postId ? { ...p, ...updated } : p))
      setFeed((f) => ({ ...f, content: merge(f.content) }))
      setMine((m) => ({ ...m, content: merge(m.content) }))
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const toggleExpand = async (postId) => {
    setExpanded((ex) => ({ ...ex, [postId]: !ex[postId] }))
    if (!commentsByPost[postId] && !expanded[postId]) {
      try {
        const list = await communityService.getComments(postId)
        setCommentsByPost((c) => ({ ...c, [postId]: list }))
      } catch {
        setErr(t('social.loadError'))
      }
    }
  }

  const submitComment = async (postId) => {
    const text = (commentDraft[postId] || '').trim()
    if (!text) return
    setErr('')
    try {
      await communityService.addComment(postId, text)
      setCommentDraft((d) => ({ ...d, [postId]: '' }))
      const list = await communityService.getComments(postId)
      setCommentsByPost((c) => ({ ...c, [postId]: list }))
      await loadFeed()
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const deletePost = async (postId) => {
    if (!window.confirm(t('social.confirmDeletePost'))) return
    try {
      await communityService.deletePost(postId)
      setMsg(t('social.postDeleted'))
      await Promise.all([loadFeed(), loadMine()])
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const reportPost = async (postId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    try {
      await moderationService.reportActivityPost(postId, { reason: reason.trim(), details: '' })
      setMsg(t('marketplace.reportSent'))
    } catch {
      setErr(t('social.saveError'))
    }
  }

  const openSpood = async (e) => {
    e.preventDefault()
    setErr('')
    const raw = otherUserHandle.trim()
    if (!raw) {
      setErr(t('social.spoodNeedIdentifier'))
      return
    }
    try {
      const resolved = await resolveOtherUserId(raw)
      if (!resolved) {
        setErr(t('social.spoodResolveError'))
        return
      }
      const row = await chatService.openThread(resolved, null)
      setActiveThread(row)
      setOtherUserHandle('')
      setProfileSuggestions([])
      const msgs = await chatService.messages(row.id, 0, 50)
      setThreadMessages(msgs)
      await loadThreads()
      setMsg(t('social.threadOpened'))
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const pickThread = async (row) => {
    setActiveThread(row)
    try {
      const msgs = await chatService.messages(row.id, 0, 50)
      setThreadMessages(msgs)
    } catch {
      setErr(t('social.loadError'))
    }
  }

  const sendSpood = async (e) => {
    e.preventDefault()
    if (!activeThread?.id) return
    const text = spoodBody.trim()
    if (!text) return
    setErr('')
    try {
      await chatService.sendMessage(activeThread.id, text)
      setSpoodBody('')
      const msgs = await chatService.messages(activeThread.id, 0, 50)
      setThreadMessages(msgs)
      await loadThreads()
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const copyInvite = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setMsg(t('social.copiedInvite'))
    } catch {
      setMsg(inviteLink)
    }
  }

  const submitSexIdCase = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    const imageUrl = (sexIdForm.imageUrl || '').trim()
    if (!imageUrl) {
      setErr(t('sexIdCase.formHint'))
      return
    }
    try {
      const row = await sexIdCaseService.create({
        title: sexIdForm.title.trim() || undefined,
        imageUrl,
        speciesHint: sexIdForm.speciesHint.trim() || undefined,
        imageType: sexIdForm.imageType || 'ventral',
        stage: sexIdForm.stage || undefined,
      })
      setMsg(t('sexIdCase.caseCreated'))
      setSexIdForm({ title: '', speciesHint: '', imageUrl: '', imageType: 'ventral', stage: '' })
      await loadSexIdCases()
      let refCode = referral?.code
      if (!refCode) {
        const r2 = await referralService.me().catch(() => null)
        refCode = r2?.code
        if (r2?.code) setReferral(r2)
      }
      const ref = refCode ? `?ref=${encodeURIComponent(refCode)}` : ''
      navigate(`/sex-id/${row.id}${ref}`)
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const onSexIdPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr('')
    setSexIdUploading(true)
    try {
      const r = await marketplaceService.uploadListingImage(f)
      if (r?.imageUrl) setSexIdForm((s) => ({ ...s, imageUrl: r.imageUrl }))
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    } finally {
      setSexIdUploading(false)
    }
  }

  const tabBtn = (key, label) => (
    <button
      type="button"
      key={key}
      className={`btn btn-sm ${tab === key ? 'btn-dark' : 'btn-outline-secondary'}`}
      onClick={() => { setTab(key); setErr(''); setMsg('') }}
    >
      {label}
    </button>
  )

  const renderPostCard = (p, { showDelete } = {}) => (
    <div
      key={p.id}
      className="rounded-3 p-3 mb-3"
      style={{ border: '1px solid var(--ta-border)', background: 'rgba(0,0,0,0.12)' }}
    >
      <div className="d-flex justify-content-between gap-2 flex-wrap">
        <div className="small text-muted">
          {p.authorHandle ? (
            <Link to={`/u/${encodeURIComponent(p.authorHandle)}`} className="text-decoration-none">
              @{p.authorHandle}
            </Link>
          ) : (p.authorDisplayName || 'keeper')}
          {'\u00a0\u00b7\u00a0'}
          <span className="text-uppercase" style={{ fontSize: '0.65rem' }}>{p.visibility}</span>
        </div>
        <div className="d-flex gap-1 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${p.likedByMe ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => onToggleLike(p.id)}
            title={t('social.like')}
            aria-pressed={!!p.likedByMe}
            aria-label={t('social.like')}
          >
            <span className="me-1" style={{ fontSize: '1.1rem', lineHeight: 1 }} aria-hidden>{'\u{1F577}\u{FE0F}'}</span>
            <span className="small">{p.likeCount ?? 0}</span>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleExpand(p.id)}>
            {t('social.comments')} ({p.commentsCount ?? 0})
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => reportPost(p.id)}>
            {t('marketplace.report')}
          </button>
          {showDelete && p.authorUserId === user?.id && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deletePost(p.id)}>
              {t('social.delete')}
            </button>
          )}
        </div>
      </div>
      {p.milestoneKind ? (
        <div className="small mt-1" style={{ color: 'var(--ta-gold)' }}>{p.milestoneKind}</div>
      ) : null}
      {p.tarantulaName ? (
        <div className="small mt-1 text-muted">
          <span className="fw-semibold" style={{ color: 'var(--ta-text-muted)' }}>{t('social.postLinkedSpider')}:</span>{' '}
          {p.tarantulaName}
          {p.tarantulaScientificName ? ` \u2014 ${p.tarantulaScientificName}` : ''}
        </div>
      ) : null}
      <p className="mb-2 mt-2 small" style={{ color: 'var(--ta-text)', whiteSpace: 'pre-wrap' }}>{p.body}</p>
      {p.imageUrl ? (
        <div className="mb-2">
          <img src={p.imageUrl} alt="" className="img-fluid rounded" style={{ maxHeight: 220 }} />
        </div>
      ) : null}
      {expanded[p.id] && (
        <div className="mt-2 pt-2 border-top border-secondary border-opacity-25">
          {(commentsByPost[p.id] || []).map((c) => (
            <div key={c.id} className="small mb-2" style={{ color: 'var(--ta-text-muted)' }}>
              <span className="fw-semibold" style={{ color: 'var(--ta-parchment)' }}>{c.authorDisplayName || 'keeper'}:</span>{' '}
              {c.body}
            </div>
          ))}
          <div className="input-group input-group-sm mt-2">
            <input
              className="form-control"
              placeholder={t('social.commentPlaceholder')}
              value={commentDraft[p.id] || ''}
              onChange={(e) => setCommentDraft((d) => ({ ...d, [p.id]: e.target.value }))}
            />
            <button type="button" className="btn btn-outline-dark" onClick={() => submitComment(p.id)}>
              {t('social.sendComment')}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 820 }}>
        <header className="ta-social-hub-hero mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-center gap-3 text-center text-sm-start">
            <BrandLogoMark size={56} showIntro className="flex-shrink-0" />
            <div className="flex-grow-1">
              <h1 className="h4 fw-bold mb-1" style={{ color: 'var(--ta-parchment)' }}>
                {t('social.pageTitle')}
              </h1>
              <p className="mb-0 small" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>
                {t('social.tagline')}
              </p>
            </div>
          </div>
        </header>

        <div className="d-flex flex-wrap gap-2 mb-3">
          {tabBtn(TAB_FEED, t('social.tabFeed'))}
          {tabBtn(TAB_SPOOD, t('social.tabSpood'))}
          {tabBtn(TAB_SEX_ID, t('social.tabSexId'))}
          {tabBtn(TAB_INVITE, t('social.tabInvite'))}
        </div>

        {err && <div className="alert alert-danger small py-2">{err}</div>}
        {msg && <div className="alert alert-success small py-2">{msg}</div>}

        {tab === TAB_FEED && (
          <>
            <div className="ta-social-feed-shell mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div className="small ta-social-feed-shell__intro">
                  {t('social.publicFeed')} - {(feed.content || []).length}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setComposerOpen((v) => !v)}
                  aria-expanded={composerOpen}
                >
                  {t('social.composerTitle')}
                </button>
              </div>
              {composerOpen && (
                <ChitinCardFrame showSilhouettes={false} variant="auth" className="mb-3">
                  <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
                    <div className="card-body py-3 px-3 px-md-4">
                      <h2 className="h6 fw-bold mb-3" style={{ color: 'var(--ta-gold)' }}>{t('social.composerTitle')}</h2>
                      <form onSubmit={submitPost} className="small">
                        <textarea
                          className="form-control form-control-sm mb-2"
                          rows={3}
                          required
                          value={composer.body}
                          onChange={(e) => setComposer((c) => ({ ...c, body: e.target.value }))}
                          placeholder={t('social.composerBodyPh')}
                        />
                        <div className="mb-2">
                          <label className="form-label small mb-0">{t('social.linkedTarantula')}</label>
                          <select
                            className="form-select form-select-sm"
                            value={composer.tarantulaId}
                            onChange={(e) => setComposer((c) => ({ ...c, tarantulaId: e.target.value }))}
                          >
                            <option value="">{t('social.linkedTarantulaNone')}</option>
                            {(myTarantulas || []).map((tar) => (
                              <option key={tar.id} value={tar.id}>
                                {(tar.name || '?')
                                  + (tar.species?.scientificName ? ` - ${tar.species.scientificName}` : '')}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="row g-2 mb-2">
                          <div className="col-md-4">
                            <label className="form-label small mb-0">{t('social.visibility')}</label>
                            <select
                              className="form-select form-select-sm"
                              value={composer.visibility}
                              onChange={(e) => setComposer((c) => ({ ...c, visibility: e.target.value }))}
                            >
                              <option value="public">{t('social.visPublic')}</option>
                              <option value="private">{t('social.visPrivate')}</option>
                              <option value="followers">{t('social.visFollowers')}</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small mb-0">{t('social.milestoneKind')}</label>
                            <input
                              className="form-control form-control-sm"
                              value={composer.milestoneKind}
                              onChange={(e) => setComposer((c) => ({ ...c, milestoneKind: e.target.value }))}
                              placeholder={t('social.milestonePh')}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small mb-0">{t('social.imageUrl')}</label>
                            <input
                              className="form-control form-control-sm"
                              value={composer.imageUrl}
                              onChange={(e) => setComposer((c) => ({ ...c, imageUrl: e.target.value }))}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        <button type="submit" className="btn btn-sm btn-dark">{t('social.publish')}</button>
                      </form>
                    </div>
                  </div>
                </ChitinCardFrame>
              )}

              <div className="row g-3">
                <div className="col-lg-8">
                  <section className="ta-social-feed-section ta-social-feed-section--community">
                    <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>{t('social.publicFeed')}</h2>
                    {(feed.content || []).length === 0 ? (
                      <p className="text-muted small mb-0">{t('social.feedEmpty')}</p>
                    ) : (
                      (feed.content || []).map((p) => renderPostCard(p, { showDelete: false }))
                    )}
                  </section>
                </div>
                <div className="col-lg-4">
                  <aside className="ta-social-feed-section ta-social-feed-section--mine">
                    <h2 className="h6 fw-bold mb-2 mt-0" style={{ color: 'var(--ta-parchment)' }}>{t('social.myPosts')}</h2>
                    {(mine.content || []).length === 0 ? (
                      <p className="text-muted small mb-0">{t('social.myPostsEmpty')}</p>
                    ) : (
                      (mine.content || []).map((p) => renderPostCard(p, { showDelete: true }))
                    )}
                  </aside>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === TAB_SPOOD && (
          <div className="row g-3">
            <div className="col-md-5">
              <div className="p-3 rounded-3 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{t('social.spoodNewTitle')}</h2>
                <form onSubmit={openSpood} className="small">
                  <label className="form-label small">Buscar keeper por @handle</label>
                  <input
                    className="form-control form-control-sm mb-2"
                    value={otherUserHandle}
                    onChange={(e) => setOtherUserHandle(e.target.value)}
                    placeholder="@keeper"
                  />
                  {searchingProfiles && (
                    <div className="small text-muted mb-2">Buscando perfiles...</div>
                  )}
                  {!searchingProfiles && profileSuggestions.length > 0 && (
                    <div className="rounded border border-secondary-subtle mb-2" style={{ maxHeight: 170, overflowY: 'auto' }}>
                      {profileSuggestions.map((row) => (
                        <button
                          key={`${row.id}`}
                          type="button"
                          className="btn btn-sm text-start w-100 border-0 rounded-0"
                          onClick={() => setOtherUserHandle(`@${row.publicHandle || ''}`)}
                        >
                          <div className="fw-semibold">@{row.publicHandle || 'keeper'}</div>
                          {row.displayName ? <div className="small text-muted">{row.displayName}</div> : null}
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="submit" className="btn btn-sm btn-dark w-100">{t('social.spoodOpen')}</button>
                </form>
                <hr />
                <h3 className="h6 fw-bold mb-2">{t('social.spoodThreads')}</h3>
                {(threads.content || []).map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    className={`btn btn-sm w-100 text-start mb-2 ${activeThread?.id === th.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                    onClick={() => pickThread(th)}
                  >
                    <div className="fw-semibold">{th.otherDisplayName || th.otherHandle || th.otherUserId}</div>
                    <div className="small text-truncate">{th.lastMessagePreview || '\u2014'}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="col-md-7">
              <div className="p-3 rounded-3 h-100 d-flex flex-column" style={{ border: '1px solid var(--ta-border)', minHeight: 320 }}>
                {!activeThread && <p className="text-muted small mb-0">{t('social.spoodPickThread')}</p>}
                {activeThread && (
                  <>
                    <div className="small text-muted mb-2">
                      {t('social.spoodWith')}: {activeThread.otherDisplayName || activeThread.otherUserId}
                    </div>
                    <div className="flex-grow-1 overflow-auto mb-2" style={{ maxHeight: 360 }}>
                      {(threadMessages.content || []).map((m) => (
                        <div
                          key={m.id}
                          className="small mb-2 p-2 rounded-2"
                          style={{
                            marginLeft: m.senderUserId === user?.id ? '2rem' : 0,
                            marginRight: m.senderUserId === user?.id ? 0 : '2rem',
                            background: m.senderUserId === user?.id ? 'rgba(200,170,80,0.15)' : 'rgba(0,0,0,0.2)',
                            color: 'var(--ta-text)',
                          }}
                        >
                          {m.body}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={sendSpood} className="input-group input-group-sm">
                      <input
                        className="form-control"
                        value={spoodBody}
                        onChange={(e) => setSpoodBody(e.target.value)}
                        placeholder={t('social.spoodPlaceholder')}
                      />
                      <button type="submit" className="btn btn-dark">{t('social.spoodSend')}</button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === TAB_SEX_ID && (
          <>
            <ChitinCardFrame showSilhouettes={false} variant="auth" className="mb-4">
              <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
                <div className="card-body py-3 px-3 px-md-4">
                  <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{t('sexIdCase.formTitle')}</h2>
                  <p className="small text-muted mb-3" style={{ lineHeight: 1.55 }}>{t('sexIdCase.formHint')}</p>
                  <form onSubmit={submitSexIdCase} className="small">
                    <div className="mb-2">
                      <label className="form-label small mb-0">{t('sexIdCase.fieldTitle')}</label>
                      <input
                        className="form-control form-control-sm"
                        value={sexIdForm.title}
                        onChange={(e) => setSexIdForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder={t('sexIdCase.fieldTitlePh')}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-0">{t('sexIdCase.fieldImageType')}</label>
                      <select
                        className="form-select form-select-sm"
                        value={sexIdForm.imageType}
                        onChange={(e) => setSexIdForm((f) => ({ ...f, imageType: e.target.value }))}
                      >
                        <option value="ventral">{t('sexIdCase.imageTypeVentral')}</option>
                        <option value="exuvia">{t('sexIdCase.imageTypeExuvia')}</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-0">{t('sexIdCase.fieldSpecies')}</label>
                      <input
                        className="form-control form-control-sm"
                        value={sexIdForm.speciesHint}
                        onChange={(e) => setSexIdForm((f) => ({ ...f, speciesHint: e.target.value }))}
                        placeholder={t('sexIdCase.fieldSpeciesPh')}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-0">{t('sexIdCase.fieldStage')}</label>
                      <select
                        className="form-select form-select-sm"
                        value={sexIdForm.stage}
                        onChange={(e) => setSexIdForm((f) => ({ ...f, stage: e.target.value }))}
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
                        disabled={sexIdUploading}
                        onChange={onSexIdPhoto}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small mb-0">{t('sexIdCase.imageUrl')}</label>
                      <input
                        className="form-control form-control-sm"
                        value={sexIdForm.imageUrl}
                        onChange={(e) => setSexIdForm((f) => ({ ...f, imageUrl: e.target.value }))}
                        placeholder="/uploads/?"
                      />
                    </div>
                    <button type="submit" className="btn btn-sm btn-dark" disabled={sexIdUploading}>
                      {t('sexIdCase.create')}
                    </button>
                  </form>
                </div>
              </div>
            </ChitinCardFrame>
            <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>{t('sexIdCase.myCases')}</h2>
            {(sexIdCases.content || []).length === 0 ? (
              <p className="text-muted small">{t('sexIdCase.myCasesEmpty')}</p>
            ) : (
              (sexIdCases.content || []).map((c) => (
                <div
                  key={c.id}
                  className="d-flex flex-wrap align-items-center justify-content-between gap-2 rounded-3 p-2 mb-2"
                  style={{ border: '1px solid var(--ta-border)' }}
                >
                  <div className="small" style={{ color: 'var(--ta-text)' }}>
                    {(c.title && c.title.trim()) || t('sexIdCase.headingFallback')}
                    <span className="text-muted ms-1">{'\u00a0?\u00a0'}{t('sexIdCase.voteTally', { n: c.totalVotes ?? 0 })}</span>
                  </div>
                  <Link className="btn btn-sm btn-outline-secondary" to={`/sex-id/${c.id}`}>
                    {t('sexIdCase.openCase')}
                  </Link>
                </div>
              ))
            )}
          </>
        )}

        {tab === TAB_INVITE && referral && (
          <ChitinCardFrame showSilhouettes={false} variant="auth">
            <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
              <div className="card-body py-3 px-3 px-md-4 small">
                <p className="mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.55 }}>{t('social.inviteLead')}</p>
                <p className="mb-1">
                  <span className="text-muted">{t('social.yourCode')}:</span>{' '}
                  <code className="user-select-all">{referral.code}</code>
                </p>
                <p className="mb-2 text-muted">
                  {t('social.inviteBonusLine', { referee: referral.refereeBonusDays, referrer: referral.referrerBonusDays })}
                </p>
                <p className="mb-2 fw-semibold" style={{ color: 'var(--ta-gold)' }}>{t('social.referralKeyline')}</p>
                <p className="mb-1 text-muted">{t('social.referralLadderIntro')}</p>
                <ul className="mb-2 ps-3 text-muted" style={{ lineHeight: 1.45 }}>
                  <li>{t('social.referralLadder1')}</li>
                  <li>{t('social.referralLadder2')}</li>
                  <li>{t('social.referralLadder3')}</li>
                  <li>{t('social.referralLadder4')}</li>
                  <li>{t('social.referralLadder5')}</li>
                </ul>
                {referral.founderKeeper && (
                  <p className="mb-2">
                    <span className="badge bg-warning text-dark">{t('social.founderKeeperBadge')}</span>
                  </p>
                )}
                <p className="mb-2 text-muted">{t('social.invitedCount', { count: referral.invitedCount ?? 0 })}</p>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-dark" onClick={copyInvite}>{t('social.copyInviteLink')}</button>
                </div>
                <p className="mt-3 mb-0 text-muted" style={{ wordBreak: 'break-all' }}>{inviteLink}</p>
              </div>
            </div>
          </ChitinCardFrame>
        )}
      </div>
    </div>
  )
}
