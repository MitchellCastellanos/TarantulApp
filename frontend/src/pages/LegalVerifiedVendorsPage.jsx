import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { usePageSeo } from '../hooks/usePageSeo'

export default function LegalVerifiedVendorsPage() {
  const { t } = useTranslation()
  const bullets = t('legal.verifiedVendors.bullets', { returnObjects: true }) || []
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: `${t('legal.verifiedVendors.title')} | TarantulApp™`,
    description: t('legal.verifiedVendors.metaDescription', {
      defaultValue: 'What the TarantulApp™ Verified Vendor badge means and how reviewed sellers are vetted before listing on the marketplace.',
    }),
    imageUrl: origin ? `${origin}/og-social.png` : undefined,
    canonicalHref: origin ? `${origin}/legal/verified-vendors` : undefined,
  })
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1">{t('legal.verifiedVendors.title')}</h2>
        <p className="text-muted small mb-4">{t('legal.lastUpdated')}</p>
        <p>{t('legal.verifiedVendors.intro')} <BrandName />.</p>
        <ul>
          {Array.isArray(bullets) ? bullets.map((b) => <li key={b}>{b}</li>) : null}
        </ul>
        <p className="mt-4">
          <Link to="/marketplace?verifiedOnly=1">{t('legal.verifiedVendors.browseCta')}</Link>
        </p>
      </div>
    </div>
  )
}
