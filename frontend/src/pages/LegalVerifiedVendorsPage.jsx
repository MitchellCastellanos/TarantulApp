import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'

export default function LegalVerifiedVendorsPage() {
  const { t } = useTranslation()
  const bullets = t('legal.verifiedVendors.bullets', { returnObjects: true }) || []
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1">{t('legal.verifiedVendors.title')}</h2>
        <p className="text-muted small mb-2">{t('legal.lastUpdated')}</p>
        <p className="small mb-4">
          <Link to="/verified-origin">{t('verifiedOrigin.learnMore')}</Link>
        </p>
        <p>{t('legal.verifiedVendors.intro')} <BrandName />.</p>
        <ul>
          {Array.isArray(bullets) ? bullets.map((b) => <li key={b}>{b}</li>) : null}
        </ul>
        <p className="mt-4">
          <Link to="/marketplace?verifiedOnly=1">{t('legal.verifiedVendors.browseCta')}</Link>
        </p>
        <hr className="my-4" />
        <p className="text-muted small mb-1">{t('legal.verifiedVendors.partnerNote')}</p>
        <p>
          <Link to="/partners">{t('legal.verifiedVendors.partnerCta')}</Link>
        </p>
      </div>
    </div>
  )
}
