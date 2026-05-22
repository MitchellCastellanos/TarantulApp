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
import { monarchLineAddUrl, openMonarchCartHandoff } from '../utils/monarchCartHandoff'

export default function PartnerCartBar() {
  const { t } = useTranslation()
  const [cart, setCart] = useState(() => readPartnerCart())
  const [open, setOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState('')
  const [handoffStep, setHandoffStep] = useState(null)
  const [cartUrl, setCartUrl] = useState(null)

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

  const cancelHandoff = () => {
    setHandoffStep(null)
    setCartUrl(null)
    setMessage('')
  }

  const checkout = async () => {
    setCheckingOut(true)
    setMessage('')
    cancelHandoff()
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
      if (!handoff) return

      if (handoff.handoffMode === 'product_pages_stepped' && cart.lines.length > 1) {
        setCartUrl(handoff.cartUrl || handoff.checkoutUrl)
        setHandoffStep(0)
        setMessage(t('marketplace.partnerCartStepIntro', { count: cart.lines.length }))
        return
      }

      if (handoff.checkoutUrl || handoff.addToCartUrls?.length) {
        openMonarchCartHandoff(handoff)
        if (!handoff.checkoutUrl && handoff.addToCartUrls?.[0]) {
          window.open(handoff.addToCartUrls[0], '_blank', 'noopener,noreferrer')
        }
        setMessage(t('marketplace.partnerCartHandoffOpened'))
      }
    } catch {
      setMessage(t('marketplace.partnerCartHandoffError'))
    } finally {
      setCheckingOut(false)
    }
  }

  const openStepAdd = (index) => {
    const line = cart.lines[index]
    const url = monarchLineAddUrl(line)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const nextHandoffStep = () => {
    if (handoffStep == null) return
    if (handoffStep < cart.lines.length - 1) {
      setHandoffStep(handoffStep + 1)
      setMessage(t('marketplace.partnerCartStepProgress', {
        current: handoffStep + 2,
        total: cart.lines.length,
      }))
      return
    }
    if (cartUrl) window.open(cartUrl, '_blank', 'noopener,noreferrer')
    setMessage(t('marketplace.partnerCartStepDone'))
    setHandoffStep(null)
  }

  if (count === 0 && !open) {
    return null
  }

  const stepLine = handoffStep != null ? cart.lines[handoffStep] : null

  return (
    <div className="ta-partner-cart-bar position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1040, maxWidth: 360 }}>
      <div className="card border-warning shadow-lg ta-premium-pane">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <button type="button" className="btn btn-sm btn-warning text-dark fw-semibold" onClick={() => setOpen((v) => !v)}>
              {t('marketplace.partnerCartTitle', { count })}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { clearPartnerCart(); refresh(); cancelHandoff() }}>
              {t('marketplace.partnerCartClear')}
            </button>
          </div>
          {open && (
            <>
              {handoffStep != null && stepLine ? (
                <div className="mb-3 p-2 rounded border border-warning border-opacity-50">
                  <p className="small fw-semibold mb-2">
                    {t('marketplace.partnerCartStepLabel', { current: handoffStep + 1, total: cart.lines.length })}
                  </p>
                  <p className="small mb-2 text-truncate">{decodeListingTitle(stepLine.title)}</p>
                  <button type="button" className="btn btn-warning text-dark btn-sm w-100 mb-2" onClick={() => openStepAdd(handoffStep)}>
                    {t('marketplace.partnerCartStepAddOnMonarch')}
                  </button>
                  <button type="button" className="btn btn-dark btn-sm w-100" onClick={nextHandoffStep}>
                    {handoffStep < cart.lines.length - 1
                      ? t('marketplace.partnerCartStepNext')
                      : t('marketplace.partnerCartStepOpenCart')}
                  </button>
                  <button type="button" className="btn btn-link btn-sm w-100 text-muted" onClick={cancelHandoff}>
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
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
                        {monarchLineAddUrl(line) && (
                          <a
                            href={monarchLineAddUrl(line)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-link btn-sm p-0 text-warning"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t('marketplace.partnerCartAddOnMonarch')}
                          </a>
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
              )}
              {handoffStep == null && (
                <button type="button" className="btn btn-warning text-dark btn-sm w-100 fw-semibold ta-partner-cart-checkout" disabled={checkingOut || cart.lines.length === 0} onClick={checkout}>
                  {checkingOut ? t('common.loading') : t('marketplace.partnerCartCheckout')}
                </button>
              )}
              {message && <p className="small text-success mb-0 mt-2">{message}</p>}
              <p className="small text-muted mb-0 mt-2">{t('marketplace.partnerCartFootnote')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
