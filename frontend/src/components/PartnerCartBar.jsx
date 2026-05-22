import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import marketplaceService from '../services/marketplaceService'
import {
  clearPartnerCart,
  partnerCartCount,
  readPartnerCart,
  updatePartnerCartQty,
} from '../utils/partnerCart'
import { decodeListingTitle } from '../utils/listingDisplay'
import { openMonarchCartHandoff } from '../utils/monarchCartHandoff'

export default function PartnerCartBar() {
  const { t } = useTranslation()
  const [cart, setCart] = useState(() => readPartnerCart())
  const [open, setOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(() => setCart(readPartnerCart()), [])

  useEffect(() => {
    refresh()
    const onCart = () => refresh()
    window.addEventListener('tarantulapp-partner-cart', onCart)
    return () => window.removeEventListener('tarantulapp-partner-cart', onCart)
  }, [refresh])

  const count = partnerCartCount(cart)

  useEffect(() => {
    if (count > 0) setOpen(true)
  }, [count])

  if (count === 0 && !open) {
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
        openMonarchCartHandoff(handoff)
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

  return (
    <div className="ta-partner-cart-bar position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1040, maxWidth: 360 }}>
      <div className="card border-warning shadow-lg ta-premium-pane">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <button type="button" className="btn btn-sm btn-warning text-dark fw-semibold" onClick={() => setOpen((v) => !v)}>
              {t('marketplace.partnerCartTitle', { count })}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { clearPartnerCart(); refresh() }}>
              {t('marketplace.partnerCartClear')}
            </button>
          </div>
          {open && (
            <>
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
              <button type="button" className="btn btn-warning text-dark btn-sm w-100 fw-semibold ta-partner-cart-checkout" disabled={checkingOut || cart.lines.length === 0} onClick={checkout}>
                {checkingOut ? t('common.loading') : t('marketplace.partnerCartCheckout')}
              </button>
              {message && <p className="small text-success mb-0 mt-2">{message}</p>}
              <p className="small text-muted mb-0 mt-2">{t('marketplace.partnerCartFootnote')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
