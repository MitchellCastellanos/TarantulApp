import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { PUBLIC_CONTACT } from '../constants/publicContact'
import { usePageSeo } from '../hooks/usePageSeo'

export default function TermsPage() {
  const { t } = useTranslation()
  const sections = t('legal.terms.sections', { returnObjects: true }) || []
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: `${t('legal.terms.title')} | TarantulApp™`,
    description: t('legal.terms.metaDescription', {
      defaultValue: 'The Terms of Service for using TarantulApp™ — the keeper logbook, species catalog, and community marketplace.',
    }),
    imageUrl: origin ? `${origin}/og-social.png` : undefined,
    canonicalHref: origin ? `${origin}/terms` : undefined,
  })
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1">{t('legal.terms.title')}</h2>
        <p className="text-muted small mb-4">{t('legal.lastUpdated')}</p>
        <p>{t('legal.terms.intro')} <BrandName />.</p>

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
        <p>General &amp; legal:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.hello}`}>{PUBLIC_CONTACT.hello}</a>
          {' · '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>
        </p>
        <p>Technical:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.support}`}>{PUBLIC_CONTACT.support}</a>
          {' · '}Billing:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.billing}`}>{PUBLIC_CONTACT.billing}</a>
          {' · '}Marketing &amp; partnerships:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.partners}`}>{PUBLIC_CONTACT.partners}</a>
        </p>
        <p className="small text-muted mb-0 mt-2">
          <Link to="/contact">All contact options</Link>
        </p>

      </div>
    </div>
  )
}
