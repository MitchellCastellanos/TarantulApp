import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'
import {
  clearPartnerCart,
  partnerCartCount,
  readPartnerCart,
  updatePartnerCartQty,
} from '../utils/partnerCart'
import { decodeListingTitle } from '../utils/listingDisplay'
import { openPartnerCartHandoff } from '../utils/partnerCartHandoff'
import InAppPaymentsBadge from './InAppPaymentsBadge'

const BAR_STATE_KEY = 'tarantulapp.partnerCartBar.state'

function readBarState() {
  try {
    const raw = sessionStorage.getItem(BAR_STATE_KEY)
    if (raw === 'minimized' || raw === 'dismissed') return raw
  } catch {
    /* ignore */
  }
  return 'expanded'
}

function writeBarState(state) {
  try {
    sessionStorage.setItem(BAR_STATE_KEY, state)
  } catch {
    /* ignore */
  }
}

export default function PartnerCartBar() {
  const { t } = useTranslation()
  const [cart, setCart] = useState(() => readPartnerCart())
  const [barState, setBarState] = useState(readBarState)
  const [checkingOut, setCheckingOut] = useState(false)
  const [payingInApp, setPayingInApp] = useState(false)
  const [paymentOptions, setPaymentOptions] = useState(null)
  const [message, setMessage] = useState('')
  const prevCountRef = useRef(partnerCartCount(readPartnerCart()))

  const setBarStatePersisted = useCallback((next) => {
    setBarState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      writeBarState(resolved)
      return resolved
    })
  }, [])

  const refresh = useCallback(() => setCart(readPartnerCart()), [])

  useEffect(() => {
    refresh()
    const onCart = () => refresh()
    window.addEventListener('tarantulapp-partner-cart', onCart)
    return () => window.removeEventListener('tarantulapp-partner-cart', onCart)
  }, [refresh])

  const count = partnerCartCount(cart)

  // Ask the backend whether this partner accepts in-app TarantulApp payment (beta, Canada).
  useEffect(() => {
    let cancelled = false
    if (!cart.vendorSlug) {
      setPaymentOptions(null)
      return undefined
    }
    marketplaceService
      .partnerCartPaymentOptions(cart.vendorSlug)
      .then((opts) => { if (!cancelled) setPaymentOptions(opts) })
      .catch(() => { if (!cancelled) setPaymentOptions(null) })
    return () => { cancelled = true }
  }, [cart.vendorSlug])

  useEffect(() => {
    if (count === 0) {
      prevCountRef.current = 0
      setBarStatePersisted('expanded')
      return
    }
    if (count > prevCountRef.current) {
      setBarStatePersisted((prev) => (prev === 'dismissed' ? 'minimized' : 'expanded'))
    }
    prevCountRef.current = count
  }, [count, setBarStatePersisted])

  if (count === 0) {
    return null
  }

  if (barState === 'dismissed') {
    return null
  }

  const checkout = async () => {
    setCheckingOut(true)
    setMessage('')
    try {
      const handoff = await marketplaceService.partnerCartHandoff({
        vendorSlug: cart.vendorSlug,
        lines: cart.lines.map((l) => ({
          externalProductId: l.externalProductId,
          quantity: l.quantity || 1,
          title: l.title,
          canonicalUrl: l.canonicalUrl || undefined,
        })),
      })
      if (handoff?.checkoutUrl) {
        openPartnerCartHandoff(handoff)
        setMessage(
          cart.lines.length > 1
            ? t('marketplace.partnerCartBatchHandoff', { count: cart.lines.length })
            : t('marketplace.partnerCartHandoffOpened'),
        )
      }
    } catch {
      setMessage(t('marketplace.partnerCartHandoffError'))
    } finally {
      setCheckingOut(false)
    }
  }

  const payInApp = async () => {
    setPayingInApp(true)
    setMessage('')
    try {
      const res = await marketplaceService.partnerCartCheckout({
        vendorSlug: cart.vendorSlug,
        lines: cart.lines.map((l) => ({
          externalProductId: l.externalProductId,
          quantity: l.quantity || 1,
        })),
      })
      if (res?.status === 'READY' && res.checkoutUrl) {
        window.location.assign(res.checkoutUrl)
        return
      }
      // Not live yet / unavailable → keep the website handoff as the fallback.
      setMessage(res?.message || t('marketplace.partnerCartInAppUnavailable'))
    } catch {
      setMessage(t('marketplace.partnerCartHandoffError'))
    } finally {
      setPayingInApp(false)
    }
  }

  const inAppAvailable = !!paymentOptions?.inAppAvailable

  if (barState === 'minimized') {
    return (
      <div className="ta-partner-cart-bar position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1040 }}>
        <button
          type="button"
          className="btn btn-warning text-dark fw-semibold shadow-lg ta-partner-cart-minimized"
          onClick={() => setBarStatePersisted('expanded')}
          aria-label={t('marketplace.partnerCartExpand')}
        >
          {t('marketplace.partnerCartTitle', { count })}
        </button>
      </div>
    )
  }

  return (
    <div className="ta-partner-cart-bar position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1040, maxWidth: 360 }}>
      <div className="card border-warning shadow-lg ta-premium-pane">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <span className="small fw-semibold text-truncate" style={{ color: 'var(--ta-gold)' }}>
              {t('marketplace.partnerCartTitle', { count })}
            </span>
            <div className="d-flex gap-1 flex-shrink-0">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setBarStatePersisted('minimized')}
                title={t('marketplace.partnerCartMinimize')}
                aria-label={t('marketplace.partnerCartMinimize')}
              >
                −
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setBarStatePersisted('dismissed')}
                title={t('marketplace.partnerCartClose')}
                aria-label={t('marketplace.partnerCartClose')}
              >
                ✕
              </button>
            </div>
          </div>
          <ul className="list-unstyled small mb-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
            {cart.lines.map((line) => (
              <li key={line.externalProductId} className="d-flex justify-content-between align-items-start gap-2 mb-2 border-bottom border-secondary border-opacity-25 pb-2">
                <div className="min-w-0">
                  <div className="fw-semibold text-truncate">{decodeListingTitle(line.title) || line.externalProductId}</div>
                  {line.priceAmount != null && (
                    <div className="text-muted">
                      {line.priceAmount} {line.currency || ''}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="form-control form-control-sm"
                  style={{ width: 64 }}
                  value={line.quantity || 1}
                  onChange={(e) => {
                    updatePartnerCartQty(line.externalProductId, Number(e.target.value) || 1)
                    refresh()
                  }}
                />
              </li>
            ))}
          </ul>
          {inAppAvailable && (
            <>
              <div className="mb-2 d-flex align-items-center gap-2 flex-wrap">
                <InAppPaymentsBadge size="sm" />
                <span className="small text-muted">{t('marketplace.inAppPaymentsFlexibleOptions')}</span>
              </div>
              <button
                type="button"
                className="btn btn-success btn-sm w-100 fw-semibold mb-2 ta-partner-cart-pay-inapp"
                disabled={payingInApp || cart.lines.length === 0}
                onClick={payInApp}
              >
                {payingInApp ? t('common.loading') : t('marketplace.partnerCartPayInApp')}
              </button>
            </>
          )}
          <div className="d-flex gap-2 mb-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary flex-grow-1"
              onClick={() => { clearPartnerCart(); refresh() }}
            >
              {t('marketplace.partnerCartClear')}
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-grow-1 fw-semibold ta-partner-cart-checkout ${inAppAvailable ? 'btn-outline-warning' : 'btn-warning text-dark'}`}
              disabled={checkingOut || cart.lines.length === 0}
              onClick={checkout}
            >
              {checkingOut ? t('common.loading') : (inAppAvailable ? t('marketplace.partnerCartCheckoutWebsite') : t('marketplace.partnerCartCheckout'))}
            </button>
          </div>
          {message && <p className="small text-success mb-0 mt-2">{message}</p>}
          <p className="small text-muted mb-0 mt-2">
            {inAppAvailable ? t('marketplace.partnerCartInAppFootnote') : t('marketplace.partnerCartFootnote')}
          </p>
        </div>
      </div>
    </div>
  )
}
