import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePageSeo } from '../hooks/usePageSeo'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import BrandLogoMark from '../components/BrandLogoMark'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
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
const FEED_SECTION_ALL = 'all'
const FEED_SECTION_MINE = 'mine'
const FEED_SECTION_ENCLOSURE = 'enclosure_check'
const FEED_SECTION_SPIDER_OKAY = 'spider_okay'
const FEED_SECTION_MEET_MY_TS = 'meet_my_ts'

/** UUID v4 (case-insensitive). */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function timeAgoLabel(iso, t) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.max(1, Math.floor(diff / 60000))
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

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
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDraft, setCommentDraft] = useState({})
  const [feedSection, setFeedSection] = useState(FEED_SECTION_ALL)
  const [likesByPost, setLikesByPost] = useState({})
  const [loadingLikesForPost, setLoadingLikesForPost] = useState({})
  const [likesHoverPostId, setLikesHoverPostId] = useState(null)
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
      if (!user?.id) {
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
    if (!token || !composerOpen || (myTarantulas || []).length > 0) return
    tarantulaService.getAll().then(setMyTarantulas).catch(() => setMyTarantulas([]))
  }, [token, composerOpen, myTarantulas])

  useEffect(() => {
    if (!token || feedSection !== 'mine') return
    loadMine().catch(() => {})
  }, [token, feedSection, loadMine])

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
    const inviteMessage = t('social.inviteShareMessage', {
      link: inviteLink,
      defaultValue: "I organize my tarantulas, molts, feedings, and enclosures in TarantulApp. Free app, free QR for each T, and we both get perks if you join with my link: {{link}}",
    })
    try {
      await navigator.clipboard.writeText(inviteMessage)
      setMsg(t('social.copiedInvite'))
    } catch {
      setMsg(inviteMessage)
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
    if (feedSection === FEED_SECTION_ENCLOSURE) return enclosurePosts
    if (feedSection === FEED_SECTION_SPIDER_OKAY) return spiderOkayPosts
    if (feedSection === FEED_SECTION_MEET_MY_TS) return meetMyTsPosts
    if (feedSection === FEED_SECTION_MINE) return mine.content || []
    return generalPosts
  }, [enclosurePosts, feedSection, generalPosts, meetMyTsPosts, mine.content, spiderOkayPosts])

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
        {p.authorHandle ? (
          <PublicKeeperHandle
            handle={p.authorHandle}
            displayName={p.authorDisplayName || 'keeper'}
            profilePhoto={p.authorProfilePhoto || p.profilePhoto || null}
            linkClassName="text-decoration-none fw-semibold"
          />
        ) : (
          p.authorDisplayName || 'keeper'
        )}
      </div>
      <p className="small mb-2 ta-social-compact-post__body">{(p.body || '').slice(0, 115) || '...'}</p>
      <div className="small text-muted d-flex justify-content-between">
        <span>{t('social.spoodCount', { count: p.likeCount ?? 0 })}</span>
        <span>{t('social.comments')} {p.commentsCount ?? 0}</span>
      </div>
    </button>
  )

  const renderTopicDots = (count, activeIndex, onPick) => (
    <div className="d-flex align-items-center justify-content-center gap-1 mt-2">
      {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
        <button
          key={i}
          type="button"
          className={`btn p-0 rounded-circle ${i === activeIndex ? 'bg-warning' : 'bg-secondary'}`}
          style={{ width: 8, height: 8, border: 'none' }}
          onClick={() => onPick(i)}
          aria-label={`slide-${i + 1}`}
        />
      ))}
    </div>
  )

  const formatPostDateTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const renderPostAuthor = (p) => {
    const handle = p.authorHandle || ''
    const display = p.authorDisplayName || 'keeper'
    const profilePhoto = p.authorProfilePhoto || p.profilePhoto || null
    return (
      <div className="d-flex align-items-center gap-2 ta-social-author-anchor">
        <img
          src={imgUrl(profilePhoto) || '/spider-default.png'}
          alt={handle ? `@${handle}` : display}
          className="ta-social-post-author-avatar"
        />
        <div className="small d-flex align-items-center gap-2 flex-wrap">
          {handle ? (
            <PublicKeeperHandle handle={handle} displayName={display} profilePhoto={profilePhoto} />
          ) : (
            <span className="fw-semibold">{display}</span>
          )}
          <span className="text-uppercase ta-social-post-privacy-tag">{p.visibility}</span>
          {p.createdAt && (
            <span className="text-muted">{formatPostDateTime(p.createdAt)}</span>
          )}
        </div>
      </div>
    )
  }

  const loadLikesPreview = useCallback(async (postId) => {
    if (!postId || likesByPost[postId] || loadingLikesForPost[postId]) return
    setLoadingLikesForPost((s) => ({ ...s, [postId]: true }))
    try {
      const rows = await communityService.listLikes(postId, 12)
      setLikesByPost((prev) => ({ ...prev, [postId]: rows || [] }))
    } catch {
      setLikesByPost((prev) => ({ ...prev, [postId]: [] }))
    } finally {
      setLoadingLikesForPost((s) => ({ ...s, [postId]: false }))
    }
  }, [likesByPost, loadingLikesForPost])

  useEffect(() => {
    const list = feedSection === 'mine' ? (mine.content || []) : generalPosts
    const targets = list.slice(0, 6).filter((p) => p?.id && !commentsByPost[p.id])
    if (targets.length === 0) return
    targets.forEach((p) => {
      communityService.getComments(p.id)
        .then((rows) => {
          setCommentsByPost((prev) => (prev[p.id] ? prev : { ...prev, [p.id]: Array.isArray(rows) ? rows : [] }))
        })
        .catch(() => {})
    })
  }, [feedSection, mine.content, generalPosts, commentsByPost])

  const renderPostCard = (p, { showDelete } = {}) => {
    const previewComments = (commentsByPost[p.id] || []).slice(0, 2)
    const likePreview = likesByPost[p.id] || []
    const likePreviewLimit = 8
    const hiddenLikeCount = Math.max(0, (p.likeCount || 0) - likePreview.length)
    return (
      <div
        key={p.id}
        className="rounded-3 p-3 mb-3 ta-social-post-card"
      >
        <div className="d-flex justify-content-between gap-2 flex-wrap align-items-start mb-2">
          {renderPostAuthor(p)}
          {showDelete && p.authorUserId === user?.id && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deletePost(p.id)}>
              {t('social.delete')}
            </button>
          )}
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

        <div className="d-flex align-items-center justify-content-between gap-2 mt-3">
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <div
              className="ta-social-spood-anchor"
              onMouseEnter={() => {
                setLikesHoverPostId(p.id)
                loadLikesPreview(p.id)
              }}
              onMouseLeave={() => setLikesHoverPostId((prev) => (prev === p.id ? null : prev))}
            >
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
              {likesHoverPostId === p.id && (
                <div className="ta-social-spood-hover-card">
                  {loadingLikesForPost[p.id] ? (
                    <div className="small text-muted">{t('social.loadingReactions')}</div>
                  ) : likePreview.length === 0 ? (
                    <div className="small text-muted">{t('social.noSpoodYet')}</div>
                  ) : (
                    <>
                      {likePreview.slice(0, likePreviewLimit).map((row) => (
                        <div key={`${row?.userId || 'u'}-${row?.likedAt || ''}`} className="ta-social-spood-hover-card__row">
                          <img
                            src={imgUrl(row?.profilePhoto) || '/spider-default.png'}
                            alt={row?.handle ? `@${row.handle}` : '@keeper'}
                            className="ta-social-spood-hover-card__avatar"
                          />
                          {row?.handle ? (
                            <PublicKeeperHandle
                              handle={row.handle}
                              displayName={row?.displayName || 'Keeper'}
                              profilePhoto={row?.profilePhoto || null}
                              linkClassName="small text-decoration-none"
                            />
                          ) : (
                            <span className="small">{row?.displayName || 'Keeper'}</span>
                          )}
                        </div>
                      ))}
                      {hiddenLikeCount > 0 && (
                        <div className="small text-muted mt-1">+{hiddenLikeCount} more</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openPostThread(p.id, true)}>
              {t('social.comments')} ({p.commentsCount ?? 0})
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-sm btn-link p-0 text-muted ta-social-mini-action" onClick={() => reportPost(p.id)}>
              {t('marketplace.report')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2 ta-social-open-thread-icon"
              onClick={() => openPostThread(p.id, false)}
              title="Open thread"
              aria-label="Open thread"
            >
              {'\u2197'}
            </button>
          </div>
        </div>

        <div className="mt-3 pt-2 border-top border-secondary border-opacity-25">
          {previewComments.length === 0 ? (
            <div className="small text-muted mb-2">{t('social.noCommentsYet')}</div>
          ) : (
            previewComments.map((c) => (
              <div key={c.id} className="small mb-2 ta-social-comment-preview">
                <span className="fw-semibold me-1">
                  {c.authorHandle ? (
                    <PublicKeeperHandle handle={c.authorHandle} displayName={c.authorDisplayName || 'keeper'} />
                  ) : (
                    c.authorDisplayName || 'keeper'
                  )}
                  :
                </span>
                <span>{c.body}</span>
              </div>
            ))
          )}
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
      </div>
    )
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
                      <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={() => navigate(`/sex-id/${(publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.id}`)}>
                        <img src={imgUrl((publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.imageUrl) || (publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 170, width: '100%', objectFit: 'cover' }} />
                      </button>
                    ) : <div className="small text-muted mb-2">{t('social.noActiveCases')}</div>}
                    {(publicSexIdCases.content || [])[topicCarouselIndex.sexId] && (
                      <div className="small text-muted mb-2">
                        {(publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.authorHandle ? (
                          <PublicKeeperHandle handle={(publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.authorHandle} />
                        ) : 'keeper'} · {timeAgoLabel((publicSexIdCases.content || [])[topicCarouselIndex.sexId]?.createdAt, t)}
                      </div>
                    )}
                    {renderTopicDots((publicSexIdCases.content || []).length, topicCarouselIndex.sexId, (i) => setTopicCarouselIndex((p) => ({ ...p, sexId: i })))}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setTab(TAB_SEX_ID)}>View list</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => setTab(TAB_SEX_ID)}>Create yours</button>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Enclosure Check</div>
                    {enclosurePosts[topicCarouselIndex.enclosure]?.imageUrl ? (
                      <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={() => openPostThread(enclosurePosts[topicCarouselIndex.enclosure]?.id, true)}>
                        <img src={imgUrl(enclosurePosts[topicCarouselIndex.enclosure]?.imageUrl) || enclosurePosts[topicCarouselIndex.enclosure]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 170, width: '100%', objectFit: 'cover' }} />
                      </button>
                    ) : <div className="small text-muted mb-2">No cases yet.</div>}
                    {enclosurePosts[topicCarouselIndex.enclosure] && (
                      <div className="small text-muted mb-2">
                        {enclosurePosts[topicCarouselIndex.enclosure]?.authorHandle ? (
                          <PublicKeeperHandle handle={enclosurePosts[topicCarouselIndex.enclosure]?.authorHandle} />
                        ) : 'keeper'} · {timeAgoLabel(enclosurePosts[topicCarouselIndex.enclosure]?.createdAt, t)}
                      </div>
                    )}
                    {renderTopicDots(enclosurePosts.length, topicCarouselIndex.enclosure, (i) => setTopicCarouselIndex((p) => ({ ...p, enclosure: i })))}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setFeedSection(FEED_SECTION_ENCLOSURE)}>View posts</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => openComposerFromTopic('Enclosure check:\n\n', 'enclosure_check')}>Create yours</button>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Is my spider okay?</div>
                    {spiderOkayPosts[topicCarouselIndex.spiderOkay]?.imageUrl ? (
                      <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={() => openPostThread(spiderOkayPosts[topicCarouselIndex.spiderOkay]?.id, true)}>
                        <img src={imgUrl(spiderOkayPosts[topicCarouselIndex.spiderOkay]?.imageUrl) || spiderOkayPosts[topicCarouselIndex.spiderOkay]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 170, width: '100%', objectFit: 'cover' }} />
                      </button>
                    ) : <div className="small text-muted mb-2">No cases yet.</div>}
                    {spiderOkayPosts[topicCarouselIndex.spiderOkay] && (
                      <div className="small text-muted mb-2">
                        {spiderOkayPosts[topicCarouselIndex.spiderOkay]?.authorHandle ? (
                          <PublicKeeperHandle handle={spiderOkayPosts[topicCarouselIndex.spiderOkay]?.authorHandle} />
                        ) : 'keeper'} · {timeAgoLabel(spiderOkayPosts[topicCarouselIndex.spiderOkay]?.createdAt, t)}
                      </div>
                    )}
                    {renderTopicDots(spiderOkayPosts.length, topicCarouselIndex.spiderOkay, (i) => setTopicCarouselIndex((p) => ({ ...p, spiderOkay: i })))}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setFeedSection(FEED_SECTION_SPIDER_OKAY)}>View posts</button>
                    <button type="button" className="btn btn-sm btn-dark w-100" onClick={() => openComposerFromTopic('Is my spider okay?\n\n', 'spider_okay')}>Create yours</button>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="rounded p-2 h-100" style={{ border: '1px solid var(--ta-border)' }}>
                    <div className="small fw-semibold mb-1">Meet my Ts</div>
                    {meetMyTsPosts[topicCarouselIndex.meetMyTs]?.imageUrl ? (
                      <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={() => openPostThread(meetMyTsPosts[topicCarouselIndex.meetMyTs]?.id, true)}>
                        <img src={imgUrl(meetMyTsPosts[topicCarouselIndex.meetMyTs]?.imageUrl) || meetMyTsPosts[topicCarouselIndex.meetMyTs]?.imageUrl} alt="" className="img-fluid rounded mb-2" style={{ height: 170, width: '100%', objectFit: 'cover' }} />
                      </button>
                    ) : <div className="small text-muted mb-2">No cases yet.</div>}
                    {meetMyTsPosts[topicCarouselIndex.meetMyTs] && (
                      <div className="small text-muted mb-2">
                        {meetMyTsPosts[topicCarouselIndex.meetMyTs]?.authorHandle ? (
                          <PublicKeeperHandle handle={meetMyTsPosts[topicCarouselIndex.meetMyTs]?.authorHandle} />
                        ) : 'keeper'} · {timeAgoLabel(meetMyTsPosts[topicCarouselIndex.meetMyTs]?.createdAt, t)}
                      </div>
                    )}
                    {renderTopicDots(meetMyTsPosts.length, topicCarouselIndex.meetMyTs, (i) => setTopicCarouselIndex((p) => ({ ...p, meetMyTs: i })))}
                    {meetMyTsPosts[topicCarouselIndex.meetMyTs]?.id && (
                      <button
                        type="button"
                        className={`btn btn-sm w-100 mb-1 ${meetMyTsPosts[topicCarouselIndex.meetMyTs]?.likedByMe ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => onToggleLike(meetMyTsPosts[topicCarouselIndex.meetMyTs]?.id)}
                        title={t('social.spoodLike')}
                      >
                        🕷️ {t('social.spoodCount', { count: meetMyTsPosts[topicCarouselIndex.meetMyTs]?.likeCount ?? 0 })}
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100 mb-1" onClick={() => setFeedSection(FEED_SECTION_MEET_MY_TS)}>View posts</button>
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
                <div className="ms-auto d-flex align-items-center gap-2">
                  {token && (
                    <button
                      type="button"
                      className={`btn btn-sm ${tab === TAB_INVITE ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => { setTab(TAB_INVITE); setErr(''); setMsg('') }}
                    >
                      {t('social.tabInvite')}
                    </button>
                  )}
                  <div className="position-relative" style={{ width: 240 }}>
                    <input
                      className="form-control form-control-sm"
                      placeholder={t('social.searchProfilesPlaceholder')}
                      value={profileQuery}
                      onChange={(e) => setProfileQuery(e.target.value)}
                    />
                    {(profileSearching || profileResults.length > 0) && (
                      <div
                        className="position-absolute start-0 end-0 mt-1 rounded p-1"
                        style={{ zIndex: 25, border: '1px solid var(--ta-border)', background: 'rgba(15,15,18,0.98)' }}
                      >
                        {profileSearching && <div className="small text-muted px-2 py-1">{t('common.loading')}</div>}
                        {!profileSearching && profileResults.map((row) => (
                          <div
                            key={row.id}
                            className="d-flex align-items-center gap-2 rounded px-2 py-1"
                          >
                            <img src={imgUrl(row.profilePhoto) || '/spider-default.png'} alt="" style={{ width: 22, height: 22, borderRadius: 999, objectFit: 'cover' }} />
                            <PublicKeeperHandle
                              handle={row.publicHandle || ''}
                              displayName={row.displayName || 'keeper'}
                              profilePhoto={row.profilePhoto || null}
                              linkClassName="small fw-semibold text-decoration-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                    <div className="btn-group btn-group-sm" role="group" aria-label="feed-switch">
                      <button
                        type="button"
                        className={`btn ${feedSection === FEED_SECTION_ALL ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setFeedSection(FEED_SECTION_ALL)}
                      >
                        Community
                      </button>
                      <button
                        type="button"
                        className={`btn ${feedSection === FEED_SECTION_MINE ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setFeedSection(FEED_SECTION_MINE)}
                      >
                        My posts
                      </button>
                    </div>
                  )}
                </div>
                {token && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 text-start mb-3 py-2"
                    onClick={() => {
                      setComposerOpen(true)
                      setComposer((c) => ({ ...c, milestoneKind: '' }))
                    }}
                  >
                    <span className="fw-semibold">New post</span>
                    <span className="d-block small text-muted">Start writing your post...</span>
                  </button>
                )}
                {activeFeedList.length === 0
                  ? <p className="text-muted small mb-0">{t('social.feedEmpty')}</p>
                  : activeFeedList.map((p) => renderPostCard(p, { showDelete: feedSection === FEED_SECTION_MINE }))}
              </section>
            </div>
          </>
        )}

        {tab === TAB_SEX_ID && (
          <>
            <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>Public Sex ID cases</h2>
            {(publicSexIdCases.content || []).length === 0 ? (
              <p className="text-muted small">{t('social.noActiveCases')}</p>
            ) : (
              (publicSexIdCases.content || []).map((c) => (
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
