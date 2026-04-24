import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import communityService from '../services/communityService'

export default function CommunityPostThreadPage() {
  const { t } = useTranslation()
  const { postId } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentBody, setCommentBody] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    if (searchParams.get('comments') === '1') {
      document.getElementById('community-thread-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchParams])

  const load = async () => {
    setErr('')
    const [p, c] = await Promise.all([
      communityService.publicPostById(postId),
      communityService.publicComments(postId),
    ])
    setPost(p)
    setComments(Array.isArray(c) ? c : [])
  }

  useEffect(() => {
    load().catch(() => setErr(t('social.loadError')))
  }, [postId, t])

  const onToggleLike = async () => {
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: `/community/post/${postId}` } })
      return
    }
    setErr('')
    try {
      const updated = await communityService.toggleLike(postId)
      setPost((prev) => ({ ...(prev || {}), ...updated }))
    } catch {
      setErr(t('social.saveError'))
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!token) {
      navigate('/login', { state: { redirectAfterAuth: `/community/post/${postId}?comments=1` } })
      return
    }
    const text = String(commentBody || '').trim()
    if (!text) return
    setErr('')
    try {
      await communityService.addComment(postId, text)
      setCommentBody('')
      setMsg(t('social.sendComment'))
      const c = await communityService.publicComments(postId)
      setComments(Array.isArray(c) ? c : [])
      setPost((p) => ({ ...p, commentsCount: Number(p?.commentsCount || 0) + 1 }))
    } catch {
      setErr(t('social.saveError'))
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 820 }}>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h1 className="h5 mb-0" style={{ color: 'var(--ta-parchment)' }}>{t('social.postThreadTitle')}</h1>
          <Link to="/community" className="btn btn-sm btn-outline-secondary">{t('common.back')}</Link>
        </div>
        {err && <div className="alert alert-danger small py-2">{err}</div>}
        {msg && <div className="alert alert-success small py-2">{msg}</div>}
        {!post ? (
          <p className="text-muted small">{t('common.loading')}</p>
        ) : (
          <div className="rounded-3 p-3 mb-3" style={{ border: '1px solid var(--ta-border)', background: 'rgba(0,0,0,0.12)' }}>
            <div className="small text-muted mb-1">
              {(post.authorHandle && `@${post.authorHandle}`) || post.authorDisplayName || 'keeper'}
            </div>
            {post.milestoneKind ? (
              <div className="small mb-1" style={{ color: 'var(--ta-gold)' }}>{post.milestoneKind}</div>
            ) : null}
            <p className="mb-2 mt-2 small" style={{ color: 'var(--ta-text)', whiteSpace: 'pre-wrap' }}>{post.body}</p>
            {post.imageUrl ? (
              <div className="mb-2">
                <img src={post.imageUrl} alt="" className="img-fluid rounded" style={{ maxHeight: 260 }} />
              </div>
            ) : null}
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className={`btn btn-sm ${post.likedByMe ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={onToggleLike}
              >
                {t('social.spoodCount', { count: post.likeCount ?? 0 })}
              </button>
              <span className="btn btn-sm btn-outline-secondary disabled">
                {t('social.comments')} ({comments.length || post.commentsCount || 0})
              </span>
            </div>
          </div>
        )}

        <div id="community-thread-comments" className="rounded-3 p-3" style={{ border: '1px solid var(--ta-border)', background: 'rgba(0,0,0,0.08)' }}>
            <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>{t('social.comments')}</h2>
            {comments.length === 0 ? (
              <p className="small text-muted mb-2">{t('social.noCommentsYet')}</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="small mb-2" style={{ color: 'var(--ta-text-muted)' }}>
                  <span className="fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
                    {c.authorHandle ? `@${c.authorHandle}` : (c.authorDisplayName || 'keeper')}:
                  </span>{' '}
                  {c.body}
                </div>
              ))
            )}
            <form className="input-group input-group-sm mt-2" onSubmit={submitComment}>
              <input
                className="form-control"
                placeholder={t('social.commentPlaceholder')}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                disabled={!token}
              />
              <button type="submit" className="btn btn-dark" disabled={!token}>
                {t('social.sendComment')}
              </button>
            </form>
            {!token && (
              <p className="small text-muted mb-0 mt-2">{t('social.loginToParticipate')}</p>
            )}
            {token && user?.id && (
              <p className="small text-muted mb-0 mt-2">{t('social.threadViewHint')}</p>
            )}
        </div>
      </div>
    </div>
  )
}
