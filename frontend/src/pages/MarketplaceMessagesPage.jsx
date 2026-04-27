import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import chatService from '../services/chatService'
import { usePageSeo } from '../hooks/usePageSeo'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MIN_CHAT_MESSAGES_FOR_REVIEW = 6
const THREAD_PAGE_SIZE = 80

export default function MarketplaceMessagesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [message, setMessage] = useState('')
  const [threads, setThreads] = useState({ content: [] })
  const [activeThread, setActiveThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState({ content: [] })
  const [chatBody, setChatBody] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [sendingReview, setSendingReview] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('marketplace.messagesPageTitle'),
    description: t('marketplace.messagingCardSub'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/marketplace/messages` : undefined,
    noindex: true,
  })

  const loadThreads = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await chatService.threads(0, THREAD_PAGE_SIZE)
      setThreads({
        ...(data || {}),
        content: Array.isArray(data?.content) ? data.content : [],
      })
    } catch {
      setThreads({ content: [], totalElements: 0, totalPages: 0, number: 0, size: THREAD_PAGE_SIZE })
    }
  }, [user?.id])

  useEffect(() => {
    loadThreads().catch(() => {})
  }, [loadThreads])

  /** Deep-link open conversation from marketplace listing ("Message seller"). */
  useEffect(() => {
    const openSeller = searchParams.get('openSeller')
    const openListing = searchParams.get('openListing')
    if (!user?.id || !openSeller?.trim()) return
    const sellerId = openSeller.trim()
    if (String(sellerId) === String(user.id)) return
    let cancelled = false
    ;(async () => {
      try {
        const listingId = openListing && UUID_REGEX.test(String(openListing).trim())
          ? String(openListing).trim()
          : null
        const row = await chatService.openThread(sellerId, listingId)
        if (cancelled) return
        setActiveThread(row)
        const msgs = await chatService.messages(row.id, 0, 50)
        if (!cancelled) setThreadMessages(msgs)
        await loadThreads()
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('openSeller')
          next.delete('openListing')
          next.set('thread', row.id)
          return next
        }, { replace: true })
      } catch (err) {
        if (!cancelled) setMessage(err?.response?.data?.error || t('marketplace.error'))
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('openSeller')
          next.delete('openListing')
          return next
        }, { replace: true })
      }
    })()
    return () => { cancelled = true }
  }, [searchParams, setSearchParams, loadThreads, user?.id, t])

  /** Select thread from ?thread= when list has loaded. */
  useEffect(() => {
    const tid = searchParams.get('thread')
    if (!tid || !UUID_REGEX.test(tid)) return
    if (activeThread && String(activeThread.id) === tid) return
    const th = (threads.content || []).find((x) => String(x.id) === tid)
    if (!th) return
    let cancelled = false
    ;(async () => {
      setActiveThread(th)
      try {
        const msgs = await chatService.messages(th.id, 0, 50)
        if (!cancelled) setThreadMessages(msgs)
      } catch {
        if (!cancelled) setMessage(t('marketplace.error'))
      }
    })()
    return () => { cancelled = true }
  }, [threads.content, searchParams, activeThread, t])

  const clearActiveThread = useCallback(() => {
    setActiveThread(null)
    setThreadMessages({ content: [] })
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('thread')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const pickThread = async (thread) => {
    setActiveThread(thread)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('thread', thread.id)
      next.delete('openSeller')
      next.delete('openListing')
      return next
    }, { replace: true })
    try {
      const msgs = await chatService.messages(thread.id, 0, 50)
      setThreadMessages(msgs)
    } catch {
      setMessage(t('marketplace.error'))
    }
  }

  const sendMarketplaceMessage = async (e) => {
    e.preventDefault()
    if (!activeThread?.id) return
    const text = (chatBody || '').trim()
    if (!text) return
    try {
      await chatService.sendMessage(activeThread.id, text)
      setChatBody('')
      const msgs = await chatService.messages(activeThread.id, 0, 50)
      setThreadMessages(msgs)
      await loadThreads()
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const sendMarketplaceReview = async (e) => {
    e.preventDefault()
    if (!activeThread?.listingId || !activeThread?.listingSellerUserId) return
    setSendingReview(true)
    setMessage('')
    try {
      await marketplaceService.addReview(activeThread.listingSellerUserId, {
        listingId: activeThread.listingId,
        rating: Number(reviewRating),
        comment: reviewComment,
      })
      setReviewComment('')
      setMessage(t('marketplace.reviewSaved'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSendingReview(false)
    }
  }

  const reportMarketplaceChat = async (threadId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportMarketplaceChat(threadId, { reason: reason.trim(), details: '' })
    setMessage(t('marketplace.reportSent'))
  }

  const reportMarketplaceSeller = async (sellerUserId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportKeeperProfile(sellerUserId, { reason: reason.trim(), details: '' })
    setMessage(t('marketplace.reportSent'))
  }

  const activeThreadMessages = Array.isArray(threadMessages.content) ? threadMessages.content : []
  const sentByCurrentUser = activeThreadMessages.filter((m) => String(m.senderUserId) === String(user?.id)).length
  const sentByOtherUser = activeThreadMessages.filter((m) => String(m.senderUserId) !== String(user?.id)).length
  const canReviewFromChat = !!activeThread
    && !!activeThread.listingId
    && !!activeThread.listingSellerUserId
    && String(activeThread.listingSellerUserId) !== String(user?.id)
    && String(activeThread.listingSellerUserId) === String(activeThread.otherUserId)
    && activeThreadMessages.length >= MIN_CHAT_MESSAGES_FOR_REVIEW
    && sentByCurrentUser >= 2
    && sentByOtherUser >= 2

  const threadList = threads.content || []

  return (
    <div className="ta-premium-page">
      <Navbar />
      <div className="container mt-4 ta-premium-shell">
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <Link to="/marketplace" className="btn btn-sm btn-outline-secondary">
            {t('marketplace.messagesBack')}
          </Link>
          <h1 className="h4 mb-0">{t('marketplace.messagesPageTitle')}</h1>
        </div>
        <p className="small text-muted mb-4">{t('marketplace.messagingCardSub')}</p>

        {message && <div className="alert alert-info small py-2">{message}</div>}

        <div className="row g-3">
          <div className={`col-12 col-lg-4 ${activeThread ? 'd-none d-lg-block' : ''}`}>
            <div className="card border-0 shadow-sm ta-premium-pane h-100">
              <div className="card-body small">
                <h2 className="h6">{t('marketplace.messagesInboxHeading')}</h2>
                {threadList.length === 0 ? (
                  <p className="text-muted mb-0">{t('marketplace.noConversationsYet')}</p>
                ) : (
                  <div style={{ maxHeight: 'min(560px, 65vh)', overflowY: 'auto' }}>
                    {threadList.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        className={`btn btn-sm w-100 text-start mb-2 py-2 ${activeThread?.id === th.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => pickThread(th)}
                      >
                        <div className="fw-semibold text-truncate">{th.otherDisplayName || th.otherHandle || 'Keeper'}</div>
                        <div className="small text-truncate text-opacity-75">{th.lastMessagePreview || '\u2014'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`col-12 col-lg-8 ${activeThread ? '' : 'd-none d-lg-block'}`}>
            <div className="card border-0 shadow-sm ta-premium-pane h-100">
              <div className="card-body">
                {!activeThread && (
                  <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 px-3 text-muted" style={{ minHeight: 280 }}>
                    <p className="mb-0">{t('marketplace.messagesSelectConversation')}</p>
                  </div>
                )}
                {activeThread && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-lg-none mb-3"
                      onClick={clearActiveThread}
                    >
                      {t('marketplace.messagesBackToList')}
                    </button>
                    <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap mb-2">
                      <div className="min-w-0">
                        <h2 className="h6 mb-0 text-truncate">
                          {activeThread.otherDisplayName || activeThread.otherHandle || 'Keeper'}
                        </h2>
                        {activeThread.otherHandle && (
                          <div className="small text-muted">@{activeThread.otherHandle}</div>
                        )}
                      </div>
                      <Link
                        to={activeThread.otherHandle ? `/u/${encodeURIComponent(activeThread.otherHandle)}` : `/marketplace/keeper/${activeThread.otherUserId}`}
                        className="btn btn-sm btn-outline-secondary flex-shrink-0"
                      >
                        {t('marketplace.viewSeller')}
                      </Link>
                    </div>
                    <div
                      className="border rounded p-3 mb-3"
                      style={{ maxHeight: 'min(420px, 55vh)', overflowY: 'auto', background: 'rgba(0,0,0,0.06)' }}
                    >
                      {activeThreadMessages.map((m) => {
                        const mine = String(m.senderUserId) === String(user?.id)
                        const who = mine
                          ? t('marketplace.chatYou')
                          : (activeThread.otherDisplayName || activeThread.otherHandle || 'Keeper')
                        return (
                          <div key={m.id} className={`small mb-2 ${mine ? 'text-end' : ''}`}>
                            <span className="fw-semibold">{who}: </span>
                            {m.body}
                          </div>
                        )
                      })}
                    </div>
                    <form className="input-group mb-3" onSubmit={sendMarketplaceMessage}>
                      <input
                        className="form-control"
                        value={chatBody}
                        onChange={(e) => setChatBody(e.target.value)}
                        placeholder={t('marketplace.chatPlaceholder')}
                      />
                      <button className="btn btn-dark" type="submit">{t('marketplace.chatSend')}</button>
                    </form>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => reportMarketplaceChat(activeThread.id)}
                      >
                        {t('marketplace.reportChat')}
                      </button>
                      {activeThread.listingSellerUserId && String(activeThread.listingSellerUserId) !== String(user?.id) && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => reportMarketplaceSeller(activeThread.listingSellerUserId)}
                        >
                          {t('marketplace.reportSeller')}
                        </button>
                      )}
                    </div>
                    {canReviewFromChat ? (
                      <form className="mt-4 pt-3 border-top" style={{ borderColor: 'var(--ta-border)' }} onSubmit={sendMarketplaceReview}>
                        <h3 className="h6 mb-2">{t('marketplace.leaveReviewInChat')}</h3>
                        <select className="form-select form-select-sm mb-2" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <textarea
                          className="form-control form-control-sm mb-2"
                          rows={2}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder={t('marketplace.reviewComment')}
                        />
                        <button className="btn btn-sm btn-dark" disabled={sendingReview}>
                          {sendingReview ? t('common.saving') : t('marketplace.sendReview')}
                        </button>
                      </form>
                    ) : (
                      <p className="small text-muted mt-3 mb-0">
                        {t('marketplace.reviewGateHint', { min: MIN_CHAT_MESSAGES_FOR_REVIEW })}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
