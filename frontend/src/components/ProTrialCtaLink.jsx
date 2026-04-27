import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const goldStyle = {
  background: 'var(--ta-gold)',
  color: '#fff',
  fontWeight: 600,
}

/**
 * Primary link to /pro with copy oriented to the 7-day trial + subscription.
 */
export default function ProTrialCtaLink({ className = 'btn btn-sm', style, children, ...rest }) {
  const { t } = useTranslation()
  return (
    <Link to="/pro" className={className} style={{ ...goldStyle, ...style }} {...rest}>
      {children ?? t('pro.ctaTryFree')}
    </Link>
  )
}
