import { useTranslation } from 'react-i18next'

/**
 * Badge shown on partners/stores that accept payment inside TarantulApp.
 * Render only when the public vendor payload reports {@code checkout.inAppAvailable}.
 *
 * @param {object} props
 * @param {'sm'|'md'} [props.size] visual size
 * @param {boolean} [props.withSub] show the "flexible payments" subline (md only)
 */
export default function InAppPaymentsBadge({ size = 'md', withSub = false, className = '' }) {
  const { t } = useTranslation()
  const small = size === 'sm'
  return (
    <span
      className={`ta-inapp-pay-badge badge d-inline-flex align-items-center gap-1 ${small ? 'small' : ''} ${className}`}
      title={t('marketplace.inAppPaymentsBadgeTooltip')}
      style={{
        background: 'linear-gradient(135deg, #1f7a4d 0%, #2bb673 100%)',
        color: '#fff',
        fontWeight: 600,
        borderRadius: 999,
        padding: small ? '0.2rem 0.5rem' : '0.35rem 0.7rem',
      }}
    >
      <span aria-hidden="true">⚡</span>
      <span>{t('marketplace.inAppPaymentsBadge')}</span>
      {withSub && !small && (
        <span className="fw-normal opacity-75">· {t('marketplace.inAppPaymentsFlexible')}</span>
      )}
    </span>
  )
}
