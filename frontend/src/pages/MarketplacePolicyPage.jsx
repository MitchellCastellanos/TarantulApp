import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { PUBLIC_CONTACT } from '../constants/publicContact'

export default function MarketplacePolicyPage() {
  const { t } = useTranslation()
  const sections = t('legal.marketplacePolicy.sections', { returnObjects: true }) || []

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 760 }}>
        <h2 className="fw-bold mb-1">{t('legal.marketplacePolicy.title')}</h2>
        <p className="text-muted small mb-4">{t('legal.lastUpdated')}</p>
        <p>{t('legal.marketplacePolicy.intro')} <BrandName />.</p>

        {sections.map((section) => (
          <div key={section.title}>
            <h5 className="fw-bold mt-4">{section.title}</h5>
            {Array.isArray(section.bullets) ? (
              <ul>
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : (
              <p>{section.body}</p>
            )}
          </div>
        ))}

        <h5 className="fw-bold mt-4">{t('legal.contactTitle')}</h5>
        <p>
          {t('legal.marketplacePolicy.contactLead')}{' '}
          <a href={`mailto:${PUBLIC_CONTACT.marketplace}`}>{PUBLIC_CONTACT.marketplace}</a>
          {' · '}
          <a href={`mailto:${PUBLIC_CONTACT.trust}`}>{PUBLIC_CONTACT.trust}</a>
        </p>
        <p className="small text-muted mb-0">
          <Link to="/terms">{t('auth.legalTerms')}</Link>
          {' · '}
          <Link to="/privacy">{t('auth.legalPrivacy')}</Link>
        </p>
      </div>
    </div>
  )
}
