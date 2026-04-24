import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePageSeo } from '../hooks/usePageSeo'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import BrandLogoMark from '../components/BrandLogoMark'
import communityService from '../services/communityService'
import tarantulaService from '../services/tarantulaService'
import referralService from '../services/referralService'
import sexIdCaseService from '../services/sexIdCaseService'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import userPublicService from '../services/userPublicService'
import { useAuth } from '../context/AuthContext'
import { imgUrl } from '../services/api'

const TAB_FEED = 'feed'
const TAB_SEX_ID = 'sexId'
const TAB_INVITE = 'invite'

/** UUID v4 (case-insensitive). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function SocialHubPage() {
  const { t } = useTranslation()
  const { user, token } = useAuth()
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
  const [postImageFile, setPostImageFile] = useState(null)
  const [postImageUploading, setPostImageUploading] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  /** Solo true al abrir desde el carrusel de temas: evita scroll brusco al usar el botón normal del feed. */
  const pendingComposerScrollRef = useRef(false)
  const composerSectionRef = useRef(null)
  const composerBodyRef = useRef(null)
  const [myTarantulas, setMyTarantulas] = useState([])
  const [expanded, setExpanded] = useState({})
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDraft, setCommentDraft] = useState({})
  const [feedSection, setFeedSection] = useState('all')
  const [likesOpenForPost, setLikesOpenForPost] = useState(null)
  const [likesByPost, setLikesByPost] = useState({})
  const [loadingLikesForPost, setLoadingLikesForPost] = useState({})
  const [profileQuery, setProfileQuery] = useState('')
  const [profileResults, setProfileResults] = useState([])
  const [profileSearching, setProfileSearching] = useState(false)
  const [topicCarouselIndex, setTopicCarouselIndex] = useState({
    sexId: 0,
    enclosure: 0,
    spiderOkay: 0,
    meetMyTs: 0,
  })

  const [referral, setReferral] = useState(null)

  const [sexIdForm, setSexIdForm] = useState({
    title: '',
    speciesHint: '',
    imageUrl: '',
    imageType: 'ventral',
    stage: '',
  })
  const [sexIdCases, setSexIdCases] = useState({ content: [], number: 0, totalPages: 0 })
  const [publicSexIdCases, setPublicSexIdCases] = useState({ content: [], number: 0, totalPages: 0 })
  const [sexIdUploading, setSexIdUploading] = useState(false)
  const [topicFeeds, setTopicFeeds] = useState({
    enclosure_check: [],
    spider_okay: [],
    meet_my_ts: [],
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('social.seoTitle'),
    description: t('social.metaDescription'),
    imageUrl: origin ? `${origin}/logo-neon.png` : undefined,
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
    if (!token) {
      setMine({ content: [], number: 0, totalPages: 0 })
      return
    }
    const data = await communityService.myPosts(0, 30)
    setMine(data)
  }, [token])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'sexId' && token) {
      setTab(TAB_SEX_ID)
    }
  }, [searchParams, token])

  const loadReferral = useCallback(async () => {
    const data = await referralService.me()
    setReferral(data)
  }, [])

  const loadSexIdCases = useCallback(async () => {
    const data = await sexIdCaseService.mine(0, 30)
    setSexIdCases(data)
  }, [])

  const loadPublicSexIdCases = useCallback(async () => {
    const data = await sexIdCaseService.listPublic(0, 12)
    setPublicSexIdCases(data || { content: [] })
  }, [])

  const loadTopicFeeds = useCallback(async () => {
    const [enclosure, spiderOkay, meetMyTs] = await Promise.all([
      communityService.publicFeedByTopic('enclosure_check', 0, 12).catch(() => ({ content: [] })),
      communityService.publicFeedByTopic('spider_okay', 0, 12).catch(() => ({ content: [] })),
      communityService.publicFeedByTopic('meet_my_ts', 0, 12).catch(() => ({ content: [] })),
    ])
    setTopicFeeds({
      enclosure_check: enclosure?.content || [],
      spider_okay: spiderOkay?.content || [],
      meet_my_ts: meetMyTs?.content || [],
    })
  }, [])

  useEffect(() => {
    loadFeed().catch(() => setErr(t('social.loadError')))
    loadPublicSexIdCases().catch(() => {})
    loadTopicFeeds().catch(() => {})
  }, [loadFeed, loadPublicSexIdCases, loadTopicFeeds, t])

  useEffect(() => {
    if (tab === TAB_FEED) {
      if (user?.id) {
        loadMine().catch(() => {})
        tarantulaService.getAll().then(setMyTarantulas).catch(() => setMyTarantulas([]))
      } else {
        setMine({ content: [], number: 0, totalPages: 0 })
        setMyTarantulas([])
      }
    }
    if (tab === TAB_INVITE) {
      if (!token) return
      loadReferral().catch(() => setErr(t('social.loadError')))
    }
    if (tab === TAB_SEX_ID) {
      if (!token) return
      loadReferral().catch(() => {})
      if (user?.id) {
        loadSexIdCases().catch(() => setErr(t('sexIdCase.loadCasesError')))
      }
    }
  }, [tab, loadMine, loadReferral, loadSexIdCases, t, user?.id, token])

  useEffect(() => {
    if (!token) return
    if (!composerOpen) {
      pendingComposerScrollRef.current = false
      return
    }
    if (!pendingComposerScrollRef.current) return
    pendingComposerScrollRef.current = false
    let cancelled = false
    const id1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return
        composerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const ta = composerBodyRef.current
        if (ta && typeof ta.focus === 'function') {
          ta.focus({ preventScroll: true })
        }
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(id1)
    }
  }, [token, composerOpen])

  const openComposerFromTopic = useCallback(
    (bodyPrefix, milestoneKind = '') => {
      if (!token) {
        navigate('/login', { state: { redirectAfterAuth: '/community' } })
        return
      }
      setErr('')
      setMsg('')
      pendingComposerScrollRef.current = true
      setComposer((c) => ({ ...c, body: bodyPrefix, visibility: 'public', milestoneKind }))
      setComposerOpen(true)
    },
    [token, navigate]
  )

  const openPostThread = useCallback(
    async (postId, openComments = false) => {
      const suffix = openComments ? '?comments=1' : ''
      navigate(`/community/post/${encodeURIComponent(postId)}${suffix}`)
    },
    [navigate]
  )

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
      setPostImageFile(null)
      setMsg(t('social.postCreated'))
      await Promise.all([loadFeed(), loadMine(), loadTopicFeeds()])
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const onToggleLike = async (postId) => {
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community' } })
      return
    }
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
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community' } })
      return
    }
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
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community' } })
      return
    }
    const text = (commentDraft[postId] || '').trim()
    if (!text) return
    setErr('')
    try {
      await communityService.addComment(postId, text)
      setCommentDraft((d) => ({ ...d, [postId]: '' }))
      const list = await communityService.getComments(postId)
      setCommentsByPost((c) => ({ ...c, [postId]: list }))
      await Promise.all([loadFeed(), loadTopicFeeds()])
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const deletePost = async (postId) => {
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community' } })
      return
    }
    if (!window.confirm(t('social.confirmDeletePost'))) return
    try {
      await communityService.deletePost(postId)
      setMsg(t('social.postDeleted'))
      await Promise.all([loadFeed(), loadMine(), loadTopicFeeds()])
    } catch (e2) {
      setErr(e2?.response?.data?.error || t('social.saveError'))
    }
  }

  const reportPost = async (postId) => {
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community' } })
      return
    }
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    try {
      await moderationService.reportActivityPost(postId, { reason: reason.trim(), details: '' })
      setMsg(t('marketplace.reportSent'))
    } catch {
      setErr(t('social.saveError'))
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
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community?tab=sexId' } })
      return
    }
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
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: '/community?tab=sexId' } })
      return
    }
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

  const feedSections = [
    { key: 'all', label: t('social.sectionForYou') },
    { key: 'questions', label: t('social.sectionQuestions') },
    { key: 'milestones', label: t('social.sectionMilestones') },
    { key: 'photos', label: t('social.sectionWithPhoto') },
    { key: 'mine', label: t('social.sectionMyPosts') },
  ]

  const publicPosts = feed.content || []
  const questionPosts = useMemo(
    () => publicPosts.filter((p) => (p.body || '').includes('?')).slice(0, 8),
    [publicPosts]
  )
  const milestonePosts = useMemo(
    () => publicPosts.filter((p) => !!p.milestoneKind).slice(0, 8),
    [publicPosts]
  )
  const photoPosts = useMemo(
    () => publicPosts.filter((p) => !!p.imageUrl).slice(0, 8),
    [publicPosts]
  )
  const featuredPosts = useMemo(() => publicPosts.slice(0, 2), [publicPosts])
  const meetMyTsPosts = useMemo(() => topicFeeds.meet_my_ts || [], [topicFeeds.meet_my_ts])
  const generalPosts = useMemo(
    () => {
      const topicIds = new Set([
        ...(topicFeeds.enclosure_check || []).map((p) => p.id),
        ...(topicFeeds.spider_okay || []).map((p) => p.id),
        ...(topicFeeds.meet_my_ts || []).map((p) => p.id),
      ])
      return publicPosts.filter((p) => !topicIds.has(p.id))
    },
    [publicPosts, topicFeeds.enclosure_check, topicFeeds.meet_my_ts, topicFeeds.spider_okay]
  )
  const enclosurePosts = useMemo(() => topicFeeds.enclosure_check || [], [topicFeeds.enclosure_check])
  const spiderOkayPosts = useMemo(() => topicFeeds.spider_okay || [], [topicFeeds.spider_okay])

  const activeFeedList = useMemo(() => {
    if (feedSection === 'questions') return questionPosts
    if (feedSection === 'milestones') return milestonePosts
    if (feedSection === 'photos') return photoPosts
    if (feedSection === 'mine') return mine.content || []
    return publicPosts
  }, [feedSection, milestonePosts, mine.content, photoPosts, publicPosts, questionPosts])

  useEffect(() => {
    const id = window.setInterval(() => {
      setTopicCarouselIndex((prev) => ({
        sexId: (prev.sexId + 1) % Math.max(1, (publicSexIdCases.content || []).length),
        enclosure: (prev.enclosure + 1) % Math.max(1, enclosurePosts.length),
        spiderOkay: (prev.spiderOkay + 1) % Math.max(1, spiderOkayPosts.length),
        meetMyTs: (prev.meetMyTs + 1) % Math.max(1, meetMyTsPosts.length),
      }))
    }, 4200)
    return () => window.clearInterval(id)
  }, [publicSexIdCases.content, enclosurePosts.length, spiderOkayPosts.length, meetMyTsPosts.length])

  const renderCompactPost = (p) => (
    <button
      key={p.id}
      type="button"
      className="ta-social-compact-post text-start w-100"
      onClick={() => openPostThread(p.id, true)}
    >
      <div className="small fw-semibold text-truncate mb-1" style={{ color: 'var(--ta-parchment)' }}>
        {(p.authorHandle && `@${p.authorHandle}`) || p.authorDisplayName || 'keeper'}
      </div>
      <p className="small mb-2 ta-social-compact-post__body">{(p.body || '').slice(0, 115) || '...'}</p>
      <div className="small text-muted d-flex justify-content-between">
        <span>{t('social.spoodCount', { count: p.likeCount ?? 0 })}</span>
        <span>{t('social.comments')} {p.commentsCount ?? 0}</span>
      </div>
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
            title={t('social.spoodLike')}
            aria-pressed={!!p.likedByMe}
            aria-label={t('social.spoodLike')}
          >
            <span className="me-1" style={{ fontSize: '1.1rem', lineHeight: 1 }} aria-hidden>{'\u{1F577}\u{FE0F}'}</span>
            <span className="small">{t('social.spoodCount', { count: p.likeCount ?? 0 })}</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => openLikesModal(p.id)}
          >
            {t('social.viewSpood')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleExpand(p.id)}>
            {t('social.comments')} ({p.commentsCount ?? 0})
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openPostThread(p.id, true)}>
            {t('social.openThread')}
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
              <span className="fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
                {c.authorHandle ? `@${c.authorHandle}` : (c.authorDisplayName || 'keeper')}:
              </span>{' '}
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

  const openLikesModal = async (postId) => {
    setLikesOpenForPost(postId)
    if (likesByPost[postId]) return
    setLoadingLikesForPost((s) => ({ ...s, [postId]: true }))
    try {
      const rows = await communityService.listLikes(postId, 60)
      setLikesByPost((prev) => ({ ...prev, [postId]: rows || [] }))
    } catch {
      setErr('No se pudo cargar la lista de Spood.')
    } finally {
      setLoadingLikesForPost((s) => ({ ...s, [postId]: false }))
    }
  }

  useEffect(() => {
    const q = (profileQuery || '').trim()
    if (q.length < 2) {
      setProfileResults([])
      setProfileSearching(false)
      return
    }
    let cancelled = false
    setProfileSearching(true)
    userPublicService.search(q, 8)
      .then((rows) => {
        if (!cancelled) setProfileResults(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setProfileResults([])
      })
      .finally(() => {
        if (!cancelled) setProfileSearching(false)
      })
    return () => { cancelled = true }
  }, [profileQuery])

  const renderLikeUser = (row) => {
    const handle = row?.handle ? `@${row.handle}` : '@keeper'
    const label = row?.displayName || 'Keeper'
    const canOpen = row?.canViewFullProfile && row?.handle
    return (
      <div key={`${row?.userId || 'u'}-${row?.likedAt || ''}`} className="ta-social-like-row">
        <img
          src={imgUrl(row?.profilePhoto) || '/spider-default.png'}
          alt={handle}
          className="ta-social-like-row__avatar"
        />
        <div className="flex-grow-1">
          {canOpen ? (
            <Link to={`/u/${encodeURIComponent(row.handle)}`} className="fw-semibold text-decoration-none">
              {handle}
            </Link>
          ) : (
            <span className="fw-semibold ta-social-preview-anchor">
              {handle}
              <span className="ta-social-preview-card">
                <span className="d-block fw-semibold mb-1">{label}</span>
                <span className="d-block small text-muted mb-1">{handle}</span>
                <span className="d-block small text-muted">Perfil en modo preview.</span>
              </span>
            </span>
          )}
          <div className="small text-muted">{label}</div>
        </div>
        {canOpen ? (
          <Link to={`/u/${encodeURIComponent(row.handle)}`} className="btn btn-sm btn-outline-secondary">Ver perfil</Link>
        ) : (
          <span className="badge text-bg-secondary">Solo preview</span>
        )}
      </div>
    )
  }

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
          {token && tabBtn(TAB_SEX_ID, t('social.tabSexId'))}
          {token && tabBtn(TAB_INVITE, t('social.tabInvite'))}
        </div>

        {!token && (
          <div className="alert alert-info small py-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span>{t('social.communityOpenBanner')}</span>
            <button
              type="button"
              className="btn btn-sm btn-dark"
              onClick={() => navigate('/login', { state: { redirectAfterAuth: '/community' } })}
            >
              {t('social.loginToParticipate')}
            </button>
          </div>
        )}

        {err && <div className="alert alert-danger small py-2">{err}</div>}
        {msg && <div className="alert alert-success small py-2">{msg}</div>}

        {tab === TAB_FEED && (
          <>
            <div className="mb-3 p-3 rounded-3" style={{ border: '1px solid var(--ta-border)', background: 'rgba(0,0,0,0.12)' }}>
              <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>Topic cases</h2>
              <div className="row g-2">
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Sex ID</div>
                    {(publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.imageUrl ? (
                      <img src={imgUrl((publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.imageUrl) || (publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 90, width: '100%', objectFit: 'cover' }} />
                    ) : <div className="small text-muted mb-2">{t('social.noActiveCases')}</div>}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setTab(TAB_SEX_ID)}>View list</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => setTab(TAB_SEX_ID)}>Create yours</button>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Enclosure Check</div>
                    {enclosurePosts[topicCarouselIndex.enclosure]?.imageUrl ? (
                      <img src={imgUrl(enclosurePosts[topicCarouselIndex.enclosure]?.imageUrl) || enclosurePosts[topicCarouselIndex.enclosure]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 90, width: '100%', objectFit: 'cover' }} />
                    ) : <div className="small text-muted mb-2">No cases yet.</div>}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setFeedSection('milestones')}>View posts</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => openComposerFromTopic('Enclosure check:\n\n', 'enclosure_check')}>Create yours</button>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Is my spider okay?</div>
                    {spiderOkayPosts[topicCarouselIndex.spiderOkay]?.imageUrl ? (
                      <img src={imgUrl(spiderOkayPosts[topicCarouselIndex.spiderOkay]?.imageUrl) || spiderOkayPosts[topicCarouselIndex.spiderOkay]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 90, width: '100%', objectFit: 'cover' }} />
                    ) : <div className="small text-muted mb-2">No cases yet.</div>}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setFeedSection('milestones')}>View posts</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => openComposerFromTopic('Is my spider okay?\n\n', 'spider_okay')}>Create yours</button>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Meet my Ts</div>
                    {meetMyTsPosts[topicCarouselIndex.meetMyTs]?.imageUrl ? (
                      <img src={imgUrl(meetMyTsPosts[topicCarouselIndex.meetMyTs]?.imageUrl) || meetMyTsPosts[topicCarouselIndex.meetMyTs]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 90, width: '100%', objectFit: 'cover' }} />
                    ) : <div className="small text-muted mb-2">No cases yet.</div>}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setFeedSection('milestones')}>View posts</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => {
                      setComposerOpen(true)
                      setComposer((c) => ({ ...c, milestoneKind: 'meet_my_ts', body: 'Meet my Ts 🕷️\n\n' }))
                    }}>Create yours</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="ta-social-feed-shell mb-4">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                {token ? (
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setComposerOpen((v) => !v)} aria-expanded={composerOpen}>
                    {t('social.composerTitle')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm btn-dark" onClick={() => navigate('/login', { state: { redirectAfterAuth: '/community' } })}>
                    {t('social.loginToPublish')}
                  </button>
                )}
              </div>
              {token && composerOpen && (
                <div ref={composerSectionRef} className="mb-3">
                  <ChitinCardFrame showSilhouettes={false} variant="auth" className="mb-0">
                  <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
                    <div className="card-body py-3 px-3 px-md-4">
                      <h2 className="h6 fw-bold mb-3" style={{ color: 'var(--ta-gold)' }}>{t('social.composerTitle')}</h2>
                      <form onSubmit={submitPost} className="small">
                        <textarea
                          ref={composerBodyRef}
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
                            <label className="form-label small mb-0">Foto (max 8MB)</label>
                            <input className="form-control form-control-sm" type="file" accept="image/*"
                              onChange={async (e) => {
                                const f = e.target.files?.[0] || null
                                setPostImageFile(f)
                                if (!f) {
                                  setComposer((c) => ({ ...c, imageUrl: '' }))
                                  return
                                }
                                setPostImageUploading(true)
                                setErr('')
                                try {
                                  const res = await communityService.uploadPostPhoto(f)
                                  setComposer((c) => ({ ...c, imageUrl: res?.imageUrl || '' }))
                                } catch (e2) {
                                  setComposer((c) => ({ ...c, imageUrl: '' }))
                                  setErr(e2?.response?.data?.error || t('social.saveError'))
                                } finally {
                                  setPostImageUploading(false)
                                }
                              }} />
                            {postImageFile && (
                              <div className="small text-muted mt-1">
                                {postImageUploading ? 'Subiendo foto...' : `Foto lista: ${postImageFile.name}`}
                              </div>
                            )}
                          </div>
                        </div>
                        <button type="submit" className="btn btn-sm btn-dark" disabled={postImageUploading}>{t('social.publish')}</button>
                      </form>
                    </div>
                  </div>
                </ChitinCardFrame>
                </div>
              )}

              <section className="ta-social-feed-section ta-social-feed-section--community">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h2 className="h6 fw-bold mb-0" style={{ color: 'var(--ta-parchment)' }}>Community feed</h2>
                  {token && (
                    <button
                      type="button"
                      className="btn btn-sm btn-dark"
                      onClick={() => {
                        setComposerOpen(true)
                        setComposer((c) => ({ ...c, milestoneKind: '' }))
                      }}
                    >
                      Create post
                    </button>
                  )}
                </div>
                <div className="mb-3 p-2 rounded-3" style={{ border: '1px solid var(--ta-border)', background: 'rgba(0,0,0,0.08)' }}>
                  <label className="form-label small mb-1">{t('social.searchProfilesLabel')}</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('social.searchProfilesPlaceholder')}
                    value={profileQuery}
                    onChange={(e) => setProfileQuery(e.target.value)}
                  />
                  {profileSearching && <div className="small text-muted mt-1">{t('common.loading')}</div>}
                  {!profileSearching && profileQuery.trim().length >= 2 && profileResults.length === 0 && (
                    <div className="small text-muted mt-1">{t('common.noResults')}</div>
                  )}
                  {profileResults.length > 0 && (
                    <div className="d-flex flex-column gap-1 mt-2">
                      {profileResults.map((row) => (
                        <Link
                          key={row.id}
                          to={`/u/${encodeURIComponent(row.publicHandle || '')}`}
                          className="d-flex align-items-center gap-2 text-decoration-none rounded p-1"
                          style={{ border: '1px solid var(--ta-border)' }}
                        >
                          <img src={imgUrl(row.profilePhoto) || '/spider-default.png'} alt="" style={{ width: 24, height: 24, borderRadius: 999, objectFit: 'cover' }} />
                          <span className="small fw-semibold" style={{ color: 'var(--ta-parchment)' }}>@{row.publicHandle || 'keeper'}</span>
                          <span className="small text-muted">{row.displayName || 'Keeper'}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {generalPosts.length === 0
                  ? <p className="text-muted small mb-0">{t('social.feedEmpty')}</p>
                  : generalPosts.map((p) => renderPostCard(p))}
              </section>
            </div>
          </>
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
        {likesOpenForPost && (
          <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.58)' }} onClick={() => setLikesOpenForPost(null)}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('social.whoSpooded')}</h5>
                  <button type="button" className="btn-close" onClick={() => setLikesOpenForPost(null)} aria-label={t('ratePrompt.close')} />
                </div>
                <div className="modal-body">
                  {loadingLikesForPost[likesOpenForPost] ? (
                    <p className="small text-muted mb-0">{t('social.loadingReactions')}</p>
                  ) : (likesByPost[likesOpenForPost] || []).length === 0 ? (
                    <p className="small text-muted mb-0">{t('social.noSpoodYet')}</p>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {(likesByPost[likesOpenForPost] || []).map((row) => renderLikeUser(row))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
