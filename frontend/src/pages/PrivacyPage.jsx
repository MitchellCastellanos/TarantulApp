import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandName from '../components/BrandName'
import { PUBLIC_CONTACT } from '../constants/publicContact'
import { usePageSeo } from '../hooks/usePageSeo'
import { BRAND_WITH_TM } from '../constants/brand'

export default function PrivacyPage() {
  const { t } = useTranslation()
  const sections = t('legal.privacy.sections', { returnObjects: true }) || []
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: `${t('legal.privacy.title')} · ${BRAND_WITH_TM}`,
    description: `${t('legal.privacy.intro')} ${BRAND_WITH_TM}.`,
    canonicalHref: origin ? `${origin}/privacy` : undefined,
  })
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h2 className="fw-bold mb-1">{t('legal.privacy.title')}</h2>
        <p className="text-muted small mb-4">{t('legal.lastUpdated')}</p>

        <p>{t('legal.privacy.intro')} <BrandName />.</p>

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

        <h5 className="fw-bold mt-4">{t('legal.privacy.rightsTitle')}</h5>
        <p>
          You may delete your account yourself in the app: see{' '}
          <Link to="/account-deletion">Account deletion</Link>
          {' '}(sign in → Account → Delete account). You may also request deletion by emailing{' '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>. We will process requests within 30 days where applicable.
        </p>

        <h5 className="fw-bold mt-4">{t('legal.contactTitle')}</h5>
        <p>Questions about this policy:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.legal}`}>{PUBLIC_CONTACT.legal}</a>
        </p>
        <p>Technical issues:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.support}`}>{PUBLIC_CONTACT.support}</a>
          {' · '}Billing &amp; Stripe:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.billing}`}>{PUBLIC_CONTACT.billing}</a>
          {' · '}Partnerships &amp; press:{' '}
          <a href={`mailto:${PUBLIC_CONTACT.partners}`}>{PUBLIC_CONTACT.partners}</a>
        </p>
        <p className="small text-muted mb-0">
          <Link to="/contact">All contact options</Link>
        </p>

      </div>
    </div>
  )
}
