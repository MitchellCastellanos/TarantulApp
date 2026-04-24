import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { usePageSeo } from '../hooks/usePageSeo'
import { useAuth } from '../context/AuthContext'
import { PUBLIC_CONTACT } from '../constants/publicContact'

export default function AboutPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('about.pageTitle'),
    description: t('about.metaDescription'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/about` : undefined,
  })

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 720 }}>
        <h1 className="fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>
          {t('about.title')}
        </h1>
        <p className="small mb-1" style={{ color: 'var(--ta-gold)', letterSpacing: '0.06em', fontWeight: 600 }}>
          {t('about.tagline')}
        </p>
        <p className="text-muted small mb-4" style={{ lineHeight: 1.55 }}>
          {t('about.lead')}
        </p>

        {[1, 2, 3, 4, 5].map((i) => (
          <section key={i} className="mb-4">
            <h2 className="h6 fw-bold mb-2 text-uppercase" style={{ color: 'var(--ta-gold)', letterSpacing: '0.04em' }}>
              {t(`about.section${i}Title`)}
            </h2>
            <p className="small mb-0" style={{ color: 'var(--ta-text)', lineHeight: 1.65 }}>
              {t(`about.section${i}Body`)}
            </p>
          </section>
        ))}

        <section className="mb-4">
          <h2 className="h6 fw-bold mb-2 text-uppercase" style={{ color: 'var(--ta-gold)', letterSpacing: '0.04em' }}>
            {t('about.sectionContactOpsTitle', { defaultValue: 'Operational contact channels' })}
          </h2>
          <p className="small mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.65 }}>
            {t('about.sectionContactOpsBody', { defaultValue: 'We use topic-specific inboxes to respond faster: technical support, Stripe billing, marketplace/community, newsletter, and trust/platform matters.' })}
          </p>
          <p className="small mb-0" style={{ color: 'var(--ta-text)' }}>
            <a href={`mailto:${PUBLIC_CONTACT.support}`}>{PUBLIC_CONTACT.support}</a>
            {' · '}
            <a href={`mailto:${PUBLIC_CONTACT.billing}`}>{PUBLIC_CONTACT.billing}</a>
            {' · '}
            <a href={`mailto:${PUBLIC_CONTACT.marketplace}`}>{PUBLIC_CONTACT.marketplace}</a>
            {' · '}
            <a href={`mailto:${PUBLIC_CONTACT.platformOps}`}>{PUBLIC_CONTACT.platformOps}</a>
          </p>
        </section>

        <div
          className="rounded-3 p-3 p-md-4 mt-4"
          style={{
            border: '1px solid rgba(200, 170, 80, 0.35)',
            background: 'rgba(30, 26, 18, 0.45)',
          }}
        >
          <p className="small mb-3" style={{ color: 'var(--ta-parchment)', lineHeight: 1.55 }}>
            {t('about.closing')}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Link
              to="/discover"
              className="btn btn-sm"
              style={{
                border: '1px solid var(--ta-gold)',
                color: 'var(--ta-gold)',
                background: 'transparent',
              }}
            >
              {t('discover.navTitle')}
            </Link>
            <Link
              to="/marketplace"
              className="btn btn-sm"
              style={{
                border: '1px solid var(--ta-border)',
                color: 'var(--ta-parchment)',
                background: 'transparent',
              }}
            >
              {t('marketplace.nav')}
            </Link>
            <Link
              to={token ? '/community' : '/login'}
              className="btn btn-sm"
              style={{
                border: '1px solid var(--ta-gold)',
                color: 'var(--ta-gold)',
                background: 'transparent',
              }}
            >
              {t('nav.community')}
            </Link>
            <Link
              to="/contact"
              className="btn btn-sm"
              style={{
                border: '1px solid var(--ta-border)',
                color: 'var(--ta-parchment)',
                background: 'transparent',
              }}
            >
              {t('nav.contact')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
