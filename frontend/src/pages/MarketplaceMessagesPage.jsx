import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import chatService from '../services/chatService'
import { imgUrl } from '../services/api'
import { usePageSeo } from '../hooks/usePageSeo'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MIN_CHAT_MESSAGES_FOR_REVIEW = 6
const THREAD_PAGE_SIZE = 80
const TX_STATUSES = ['pending', 'claim_requested', 'reserved', 'paid', 'shipped', 'delivered', 'disputed', 'cancelled']

export default function MarketplaceMessagesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [message, setMessage] = useState('')
  const [threads, setThreads] = useState({ content: [] })
  const [activeThread, setActiveThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState({ content: [] })
  const [threadEvents, setThreadEvents] = useState([])
  const [chatBody, setChatBody] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [sendingReview, setSendingReview] = useState(false)
  const [updatingTxStatus, setUpdatingTxStatus] = useState(false)
  const [eventType, setEventType] = useState('note')
  const [eventNote, setEventNote] = useState('')
  const [eventEvidenceUrl, setEventEvidenceUrl] = useState('')
  const [eventEvidenceFiles, setEventEvidenceFiles] = useState([])
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  const [pushDeliveries, setPushDeliveries] = useState([])
  const [threadOrder, setThreadOrder] = useState(null)
  const [threadOrderEvents, setThreadOrderEvents] = useState([])
  const [orderPolicyAccepted, setOrderPolicyAccepted] = useState(false)
  const [orderPaymentRef, setOrderPaymentRef] = useState('')

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

  const refreshThreadDealState = useCallback(async (thread) => {
    const tid = thread?.id
    if (!tid || !thread?.listingId) {
      setThreadOrder(null)
      setThreadOrderEvents([])
      return
    }
    try {
      const order = await chatService.getThreadOrder(tid).catch(() => null)
      setThreadOrder(order)
      const ev = order ? await chatService.threadOrderEvents(tid).catch(() => []) : []
      setThreadOrderEvents(Array.isArray(ev) ? ev : [])
    } catch {
      setThreadOrder(null)
      setThreadOrderEvents([])
    }
  }, [])

  const refreshThreadOrderAuditOnly = useCallback(async (threadId) => {
    if (!threadId) {
      setThreadOrderEvents([])
      return
    }
    try {
      const ev = await chatService.threadOrderEvents(threadId).catch(() => [])
      setThreadOrderEvents(Array.isArray(ev) ? ev : [])
    } catch {
      setThreadOrderEvents([])
    }
  }, [])

  /** Deep-link open conversation from marketplace listing ("Message seller"). */
  useEffect(() => {
    const checkoutFlag = searchParams.get('orderCheckout')
    if (!checkoutFlag) return
    if (checkoutFlag === 'success') setMessage(t('marketplace.orderCheckoutSuccess'))
    if (checkoutFlag === 'cancel') setMessage(t('marketplace.orderCheckoutCancel'))
    const next = new URLSearchParams(searchParams)
    next.delete('orderCheckout')
    next.delete('session_id')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, t])

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
        const events = await chatService.threadEvents(row.id).catch(() => [])
        if (!cancelled) setThreadEvents(Array.isArray(events) ? events : [])
        if (!cancelled && row.listingId) await refreshThreadDealState(row)
        else if (!cancelled) {
          setThreadOrder(null)
          setThreadOrderEvents([])
        }
        const pushes = row.listingId
          ? await chatService.threadPushDeliveries(row.id).catch(() => [])
          : []
        if (!cancelled) setPushDeliveries(Array.isArray(pushes) ? pushes : [])
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
  }, [searchParams, setSearchParams, loadThreads, user?.id, t, refreshThreadDealState])

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
        const events = await chatService.threadEvents(th.id).catch(() => [])
        if (!cancelled) setThreadEvents(Array.isArray(events) ? events : [])
        if (!cancelled && th.listingId) await refreshThreadDealState(th)
        else if (!cancelled) {
          setThreadOrder(null)
          setThreadOrderEvents([])
        }
        if (th.listingId) {
          const pushes = await chatService.threadPushDeliveries(th.id).catch(() => [])
          if (!cancelled) setPushDeliveries(Array.isArray(pushes) ? pushes : [])
        } else if (!cancelled) {
          setPushDeliveries([])
        }
      } catch {
        if (!cancelled) setMessage(t('marketplace.error'))
      }
    })()
    return () => { cancelled = true }
  }, [threads.content, searchParams, activeThread, t, refreshThreadDealState])

  const clearActiveThread = useCallback(() => {
    setActiveThread(null)
    setThreadMessages({ content: [] })
    setThreadEvents([])
    setPushDeliveries([])
    setThreadOrder(null)
    setThreadOrderEvents([])
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
      const events = await chatService.threadEvents(thread.id).catch(() => [])
      setThreadEvents(Array.isArray(events) ? events : [])
      if (thread.listingId) await refreshThreadDealState(thread)
      else {
        setThreadOrder(null)
        setThreadOrderEvents([])
      }
    } catch {
      setMessage(t('marketplace.error'))
    }
  }

  const createThreadOrderIntent = async () => {
    if (!activeThread?.id) return
    if (!orderPolicyAccepted) {
      setMessage(t('marketplace.orderPolicyMustAccept'))
      return
    }
    try {
      const order = await chatService.createOrderIntent(activeThread.id, { legalAccepted: true })
      setThreadOrder(order)
      await refreshThreadOrderAuditOnly(activeThread.id)
      setMessage(t('marketplace.orderCreated'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const reportThreadOrderIssue = async () => {
    if (!activeThread?.id) return
    try {
      const order = await chatService.reportOrderIssue(activeThread.id)
      setThreadOrder(order)
      await refreshThreadOrderAuditOnly(activeThread.id)
      setMessage(t('marketplace.orderIssueReported'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const reportOrderPayment = async () => {
    if (!activeThread?.id) return
    try {
      const order = await chatService.reportOrderPayment(activeThread.id, orderPaymentRef)
      setThreadOrder(order)
      await refreshThreadOrderAuditOnly(activeThread.id)
      setMessage(t('marketplace.orderPaymentReported'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const markOrderInTransit = async () => {
    if (!activeThread?.id) return
    try {
      const order = await chatService.markOrderInTransit(activeThread.id)
      setThreadOrder(order)
      await refreshThreadOrderAuditOnly(activeThread.id)
      setMessage(t('marketplace.orderMarkedInTransit'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const markOrderDelivered = async () => {
    if (!activeThread?.id) return
    try {
      const order = await chatService.markOrderDelivered(activeThread.id)
      setThreadOrder(order)
      await refreshThreadOrderAuditOnly(activeThread.id)
      setMessage(t('marketplace.orderMarkedDelivered'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const closeThreadOrder = async () => {
    if (!activeThread?.id) return
    try {
      const order = await chatService.closeOrder(activeThread.id)
      setThreadOrder(order)
      await refreshThreadOrderAuditOnly(activeThread.id)
      setMessage(t('marketplace.orderClosed'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
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

  const updateThreadTransactionStatus = async (status) => {
    if (!activeThread?.id || !activeThread?.listingId) return
    setUpdatingTxStatus(true)
    setMessage('')
    try {
      const updated = await chatService.updateTransactionStatus(activeThread.id, status)
      setActiveThread(updated)
      const events = await chatService.threadEvents(updated.id).catch(() => [])
      setThreadEvents(Array.isArray(events) ? events : [])
      if (updated.listingId) {
        const pushes = await chatService.threadPushDeliveries(updated.id).catch(() => [])
        setPushDeliveries(Array.isArray(pushes) ? pushes : [])
      }
      await loadThreads()
      setMessage(t('marketplace.txStatusSaved'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setUpdatingTxStatus(false)
    }
  }

  const submitThreadEvent = async (e) => {
    e.preventDefault()
    if (!activeThread?.id || !activeThread?.listingId) return
    setSavingEvent(true)
    setMessage('')
    try {
      let uploadedEvidenceUrls = []
      if (eventEvidenceFiles.length > 0) {
        setUploadingEvidence(true)
        for (const f of eventEvidenceFiles) {
          // Sequential to avoid overloading weak mobile connections.
          const upload = await chatService.uploadThreadEventEvidence(activeThread.id, f)
          if (upload?.evidenceUrl) uploadedEvidenceUrls.push(upload.evidenceUrl)
        }
      }
      await chatService.addThreadEvent(activeThread.id, {
        eventType,
        note: eventNote,
        evidenceUrl: eventEvidenceUrl,
        evidenceUrls: uploadedEvidenceUrls,
      })
      const events = await chatService.threadEvents(activeThread.id).catch(() => [])
      setThreadEvents(Array.isArray(events) ? events : [])
      if (activeThread.listingId) {
        const pushes = await chatService.threadPushDeliveries(activeThread.id).catch(() => [])
        setPushDeliveries(Array.isArray(pushes) ? pushes : [])
      }
      setEventNote('')
      setEventEvidenceUrl('')
      setEventEvidenceFiles([])
      setMessage(t('marketplace.txEventSaved'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setUploadingEvidence(false)
      setSavingEvent(false)
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
  const isSellerInThread = !!activeThread?.listingSellerUserId && String(activeThread.listingSellerUserId) === String(user?.id)
  const canCreateOrder = !!activeThread?.listingId && !isSellerInThread && !threadOrder

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
                    {activeThread.listingId && (
                      <div className="mt-3 border rounded p-2 small">
                        <div className="fw-semibold mb-2">{t('marketplace.orderPanelTitle')}</div>
                        <p className="text-muted mb-2">{t('marketplace.orderDirectPaymentNotice')}</p>
                        <p className="text-muted mb-2">
                          {t('marketplace.orderLegalNotice')}{' '}
                          <Link to="/terms" target="_blank" rel="noreferrer">{t('auth.legalTerms')}</Link>
                          {' '}·{' '}
                          <Link to="/marketplace-policy" target="_blank" rel="noreferrer">{t('legal.marketplacePolicy.title')}</Link>
                        </p>
                        <div className="small text-muted mb-2">
                          <div className="fw-semibold mb-1">{t('marketplace.orderChecklistTitle')}</div>
                          <ul className="mb-0 ps-3">
                            <li>{t('marketplace.orderChecklistRule1')}</li>
                            <li>{t('marketplace.orderChecklistRule2')}</li>
                            <li>{t('marketplace.orderChecklistRule3')}</li>
                            <li>{t('marketplace.orderChecklistRule4')}</li>
                            <li>{t('marketplace.orderChecklistRule5')}</li>
                          </ul>
                        </div>
                        {!threadOrder && (
                          <div className="d-flex flex-column gap-2">
                            <span className="text-muted">{t('marketplace.orderPanelEmpty')}</span>
                            {canCreateOrder && (
                              <>
                                <div className="form-check">
                                  <input
                                    id="order-policy-accept"
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={!!orderPolicyAccepted}
                                    onChange={(e) => setOrderPolicyAccepted(e.target.checked)}
                                  />
                                  <label htmlFor="order-policy-accept" className="form-check-label text-muted">
                                    {t('marketplace.orderPolicyAcceptLabel')}
                                  </label>
                                </div>
                                <button type="button" className="btn btn-sm btn-outline-dark align-self-start" onClick={createThreadOrderIntent}>
                                  {t('marketplace.orderCreateCta')}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        {threadOrder && (
                          <>
                            <div className="small text-muted mb-1">{t('marketplace.orderStatus')}: {threadOrder.status}</div>
                            <div className="small text-muted mb-2">
                              {t('marketplace.orderAgreedSubtotal')}: {threadOrder.subtotal} {threadOrder.currency || ''}
                            </div>
                            <div className="small text-muted mb-2">
                              {threadOrder.paymentReportedAt && <div>{t('marketplace.orderTimelinePaymentReported')}: {new Date(threadOrder.paymentReportedAt).toLocaleString()}</div>}
                              {threadOrder.shippedAt && <div>{t('marketplace.orderTimelineShipped')}: {new Date(threadOrder.shippedAt).toLocaleString()}</div>}
                              {threadOrder.deliveredAt && <div>{t('marketplace.orderTimelineDelivered')}: {new Date(threadOrder.deliveredAt).toLocaleString()}</div>}
                              {threadOrder.closedAt && <div>{t('marketplace.orderTimelineClosed')}: {new Date(threadOrder.closedAt).toLocaleString()}</div>}
                            </div>
                            {threadOrder.termsSummary && (
                              <div className="small text-muted mb-2">
                                <span className="fw-semibold">{t('marketplace.orderTermsSnapshot')}:</span> {threadOrder.termsSummary}
                              </div>
                            )}
                            <div className="d-flex gap-2 flex-wrap">
                              {!isSellerInThread && threadOrder.status === 'payment_pending' && (
                                <div className="d-flex flex-column gap-2">
                                  <div className="d-flex gap-2 align-items-center flex-wrap">
                                    <input
                                      className="form-control form-control-sm"
                                      style={{ maxWidth: 220 }}
                                      value={orderPaymentRef}
                                      onChange={(e) => setOrderPaymentRef(e.target.value)}
                                      placeholder={t('marketplace.orderPaymentReference')}
                                    />
                                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={reportOrderPayment}>
                                      {t('marketplace.orderReportPaymentCta')}
                                    </button>
                                  </div>
                                  <span className="text-muted small">{t('marketplace.orderReportPaymentHint')}</span>
                                </div>
                              )}
                              {isSellerInThread && (threadOrder.status === 'payment_reported' || threadOrder.status === 'paid_in_hold') && (
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={markOrderInTransit}>
                                  {t('marketplace.orderMarkInTransitCta')}
                                </button>
                              )}
                              {!isSellerInThread && threadOrder.status === 'in_transit' && (
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={markOrderDelivered}>
                                  {t('marketplace.orderMarkDeliveredCta')}
                                </button>
                              )}
                              {threadOrder.status === 'delivered' && (
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={closeThreadOrder}>
                                  {t('marketplace.orderCloseCta')}
                                </button>
                              )}
                              {threadOrder.status !== 'disputed'
                                && threadOrder.status !== 'closed'
                                && (threadOrder.status === 'payment_pending'
                                  || threadOrder.status === 'payment_reported'
                                  || threadOrder.status === 'in_transit'
                                  || threadOrder.status === 'delivered') && (
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reportThreadOrderIssue}>
                                  {t('marketplace.orderReportIssueCta')}
                                </button>
                              )}
                            </div>
                            {threadOrderEvents.length > 0 && (
                              <details className="mt-2 pt-2 border-top">
                                <summary className="text-muted fw-semibold" style={{ cursor: 'pointer' }}>
                                  {t('marketplace.orderAuditTitle')}
                                </summary>
                                <ul className="small text-muted mt-2 mb-0 ps-3" style={{ lineHeight: 1.5 }}>
                                  {threadOrderEvents.map((ev) => (
                                    <li key={ev.id} className="mb-1">
                                      <span>{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : '—'} — </span>
                                      <span>
                                        {t(`marketplace.orderEvent.${ev.eventType}`, { defaultValue: String(ev.eventType || '') })}
                                      </span>
                                      {(ev.fromStatus || ev.toStatus) && (
                                        <span>
                                          {' '}
                                          ({[ev.fromStatus, ev.toStatus].filter(Boolean).join(' → ')})
                                        </span>
                                      )}
                                      {ev.payload && (
                                        <div className="mt-1 text-break opacity-75">{ev.payload}</div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {activeThread.listingId && (
                      <div className="mt-3 border rounded p-2 small">
                        <div className="fw-semibold mb-1">{t('marketplace.txStatusTitle')}</div>
                        <div className="small text-muted mb-2">
                          {t('marketplace.txCurrentStatus')}: {t(`marketplace.txStatus.${activeThread.transactionStatus || 'pending'}`)}
                        </div>
                        <div className="small text-muted mb-2">
                          {t('marketplace.txProofRules')}
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          {TX_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`btn btn-sm ${String(activeThread.transactionStatus || 'pending') === s ? 'btn-dark' : 'btn-outline-secondary'}`}
                              disabled={updatingTxStatus}
                              onClick={() => updateThreadTransactionStatus(s)}
                            >
                              {t(`marketplace.txStatus.${s}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeThread.listingId && (
                      <div className="mt-3 border rounded p-2 small">
                        <div className="fw-semibold mb-2">{t('marketplace.txTimelineTitle')}</div>
                        <div className="d-flex flex-column gap-2 mb-3">
                          {threadEvents.length === 0 && (
                            <div className="text-muted">{t('marketplace.txTimelineEmpty')}</div>
                          )}
                          {threadEvents.map((ev) => (
                            <div key={ev.id} className="border rounded p-2">
                              <div className="fw-semibold">
                                {t(`marketplace.txEventType.${ev.eventType}`, { defaultValue: ev.eventType })}
                                {ev.eventStatus ? ` · ${t(`marketplace.txStatus.${ev.eventStatus}`, { defaultValue: ev.eventStatus })}` : ''}
                              </div>
                              {ev.note ? <div className="small mt-1">{ev.note}</div> : null}
                              {(Array.isArray(ev.evidenceUrls) ? ev.evidenceUrls : []).length > 0 ? (
                                <div className="small mt-1 d-flex flex-wrap gap-2">
                                  {(ev.evidenceUrls || []).map((url, idx) => (
                                    <a key={`${ev.id}-evidence-${idx}`} href={imgUrl(url) || url} target="_blank" rel="noreferrer">
                                      {t('marketplace.txEvidenceLink')} #{idx + 1}
                                    </a>
                                  ))}
                                </div>
                              ) : ev.evidenceUrl ? (
                                <div className="small mt-1">
                                  <a href={imgUrl(ev.evidenceUrl) || ev.evidenceUrl} target="_blank" rel="noreferrer">{t('marketplace.txEvidenceLink')}</a>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <form onSubmit={submitThreadEvent}>
                          <div className="row g-2">
                            <div className="col-md-4">
                              <select
                                className="form-select form-select-sm"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                              >
                                {['note', 'shipping_proof', 'arrival_proof', 'dispute_note'].map((tp) => (
                                  <option key={tp} value={tp}>
                                    {t(`marketplace.txEventType.${tp}`, { defaultValue: tp })}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-8">
                              <input
                                className="form-control form-control-sm"
                                placeholder={t('marketplace.txEvidenceUrlPlaceholder')}
                                value={eventEvidenceUrl}
                                onChange={(e) => setEventEvidenceUrl(e.target.value)}
                              />
                            </div>
                          </div>
                          <input
                            type="file"
                            className="form-control form-control-sm mt-2"
                            accept="image/*"
                            multiple
                            onChange={(e) => setEventEvidenceFiles(Array.from(e.target.files || []))}
                          />
                          <textarea
                            className="form-control form-control-sm mt-2"
                            rows={2}
                            placeholder={t('marketplace.txNotePlaceholder')}
                            value={eventNote}
                            onChange={(e) => setEventNote(e.target.value)}
                          />
                          <button className="btn btn-sm btn-dark mt-2" disabled={savingEvent || uploadingEvidence}>
                            {(savingEvent || uploadingEvidence) ? t('common.saving') : t('marketplace.txAddEvent')}
                          </button>
                        </form>
                      </div>
                    )}
                    {activeThread.listingId && (
                      <div className="mt-3 border rounded p-2 small">
                        <div className="fw-semibold mb-1">{t('marketplace.txPushAuditTitle')}</div>
                        <p className="text-muted mb-2" style={{ fontSize: '0.72rem' }}>{t('marketplace.txPushAuditLead')}</p>
                        {pushDeliveries.length === 0 ? (
                          <div className="text-muted">{t('marketplace.txPushAuditEmpty')}</div>
                        ) : (
                          <div className="table-responsive mb-0">
                            <table className="table table-sm table-borderless mb-0" style={{ fontSize: '0.72rem' }}>
                              <thead>
                                <tr className="text-muted">
                                  <th>{t('marketplace.txPushType')}</th>
                                  <th>{t('marketplace.txPushRecipient')}</th>
                                  <th className="text-end">{t('marketplace.txPushDevices')}</th>
                                  <th className="text-end">{t('marketplace.txPushAck')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pushDeliveries.map((row) => (
                                  <tr key={row.id}>
                                    <td>{t(`marketplace.pushKinds.${String(row.notificationType || '').replace(/^MARKETPLACE_/, '').toLowerCase()}`, {
                                      defaultValue: row.notificationType || '—',
                                    })}</td>
                                    <td>{row.recipientIsYou ? t('marketplace.txPushYou') : t('marketplace.txPushOtherParty')}</td>
                                    <td className="text-end">{row.fcmSuccessCount ?? '0'}</td>
                                    <td className="text-end">
                                      {row.receivedAckAt ? t('marketplace.txPushAckYes') : t('marketplace.txPushAckNo')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
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
