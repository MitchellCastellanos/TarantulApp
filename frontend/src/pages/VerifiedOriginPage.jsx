import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import VerifiedOriginBadge from '../components/VerifiedOriginBadge'
import { usePageSeo } from '../hooks/usePageSeo'

const KINDS = ['breeder', 'store', 'vendor', 'seller']

const SCREENSHOTS = [
  {
    src: '/outreach/monarch/01-storefront-wide.webp',
    captionKey: 'verifiedOriginLanding.screenshotStorefront',
  },
  {
    src: '/outreach/monarch/02-marketplace-card.webp',
    captionKey: 'verifiedOriginLanding.screenshotMarketplace',
  },
]

export default function VerifiedOriginPage() {
  const { t } = useTranslation()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = origin ? `${origin}/verified-origin` : 'https://tarantulapp.com/verified-origin'

  usePageSeo({
    title: t('verifiedOriginLanding.pageTitle'),
    description: t('verifiedOriginLanding.metaDescription'),
    imageUrl: origin ? `${origin}/outreach/monarch/02-marketplace-card.webp` : undefined,
    canonicalHref: publicUrl,
  })

  const certifies = t('verifiedOriginLanding.certifiesItems', { returnObjects: true }) || []
  const notCertifies = t('verifiedOriginLanding.notCertifiesItems', { returnObjects: true }) || []
  const howSteps = t('verifiedOriginLanding.howSteps', { returnObjects: true }) || []
  const deliverySteps = t('verifiedOriginLanding.deliverySteps', { returnObjects: true }) || []

  return (
    <div className="ta-premium-page">
      <Navbar />
      <div className="container mt-4 ta-premium-shell pb-5" style={{ maxWidth: 920 }}>
        <header className="mb-5">
          <p
            className="small text-uppercase fw-bold mb-2"
            style={{ color: 'var(--ta-gold-classic)', letterSpacing: '0.08em' }}
          >
            {t('verifiedOriginLanding.eyebrow')}
          </p>
          <div className="row g-4 align-items-start">
            <div className="col-lg-7">
              <h1 className="h3 fw-bold mb-3">{t('verifiedOriginLanding.heroTitle')}</h1>
              <p className="text-muted mb-4" style={{ maxWidth: '38rem', lineHeight: 1.6 }}>
                {t('verifiedOriginLanding.heroLead')}
              </p>
              <div className="d-flex flex-wrap gap-2 mb-4">
                <VerifiedOriginBadge
                  origin={{ verified: true, kind: 'BREEDER', displayName: t('verifiedOrigin.kind.breeder') }}
                />
                <VerifiedOriginBadge
                  origin={{ verified: true, kind: 'STORE', displayName: t('verifiedOrigin.kind.store') }}
                />
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/marketplace?verifiedOnly=1" className="btn btn-success btn-sm fw-semibold">
                  {t('verifiedOriginLanding.ctaBrowse')}
                </Link>
                <Link to="/studio/origin" className="btn btn-outline-dark btn-sm">
                  {t('verifiedOriginLanding.ctaApply')}
                </Link>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h2 className="h6 fw-bold mb-2">{t('verifiedOriginLanding.kindsTitle')}</h2>
                  <p className="small text-muted mb-3">{t('verifiedOriginLanding.kindsBlurb')}</p>
                  <div className="d-flex flex-wrap gap-2">
                    {KINDS.map((kind) => (
                      <span key={kind} className="badge bg-light text-dark border">
                        {t(`verifiedOrigin.kind.${kind}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-5">
          <h2 className="h5 fw-bold mb-3">{t('verifiedOriginLanding.certifiesTitle')}</h2>
          <div className="row g-3">
            {Array.isArray(certifies)
              ? certifies.map((item) => (
                  <div key={item.title} className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <h3 className="h6 fw-bold mb-2">{item.title}</h3>
                        <p className="small text-muted mb-0" style={{ lineHeight: 1.6 }}>
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </section>

        <section className="mb-5">
          <div
            className="rounded-3 p-4"
            style={{
              border: '1px solid rgba(108, 117, 125, 0.25)',
              background: 'rgba(248, 249, 250, 0.85)',
            }}
          >
            <h2 className="h6 fw-bold mb-2">{t('verifiedOriginLanding.notCertifiesTitle')}</h2>
            <ul className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.65 }}>
              {Array.isArray(notCertifies) ? notCertifies.map((line) => <li key={line}>{line}</li>) : null}
            </ul>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="h5 fw-bold mb-3">{t('verifiedOriginLanding.howTitle')}</h2>
          <div className="row g-3">
            {Array.isArray(howSteps)
              ? howSteps.map((step, i) => (
                  <div key={step.title} className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <p
                          className="small fw-bold mb-2"
                          style={{ color: 'var(--ta-gold-classic)', letterSpacing: '0.06em' }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </p>
                        <h3 className="h6 fw-bold mb-2">{step.title}</h3>
                        <p className="small text-muted mb-0" style={{ lineHeight: 1.6 }}>
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              : null}
          </div>
        </section>

        <section className="mb-5">
          <div className="card border-success border-opacity-25 shadow-sm">
            <div className="card-body p-4">
              <h2 className="h6 fw-bold mb-2">{t('verifiedOriginLanding.deliveryTitle')}</h2>
              <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>
                {t('verifiedOriginLanding.deliveryBody')}
              </p>
              <ol className="small mb-0 ps-3" style={{ lineHeight: 1.65 }}>
                {Array.isArray(deliverySteps) ? deliverySteps.map((line) => <li key={line}>{line}</li>) : null}
              </ol>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <h2 className="h5 fw-bold mb-3">{t('verifiedOriginLanding.whereTitle')}</h2>
          <div className="row g-3">
            {SCREENSHOTS.map((shot) => (
              <div key={shot.src} className="col-md-6">
                <div className="card border-0 shadow-sm h-100 overflow-hidden">
                  <img
                    src={shot.src}
                    alt={t(shot.captionKey)}
                    className="w-100"
                    style={{ objectFit: 'cover', maxHeight: 280 }}
                    loading="lazy"
                  />
                  <div className="card-body p-3">
                    <p className="small text-muted mb-0">{t(shot.captionKey)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h2 className="h5 fw-bold mb-3">{t('verifiedOriginLanding.compareTitle')}</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card border-success border-opacity-50 shadow-sm h-100">
                <div className="card-body p-4">
                  <h3 className="h6 fw-bold mb-2">{t('verifiedOriginLanding.compareVoTitle')}</h3>
                  <p className="small text-muted mb-0" style={{ lineHeight: 1.6 }}>
                    {t('verifiedOriginLanding.compareVoBody')}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card border-warning border-opacity-50 shadow-sm h-100">
                <div className="card-body p-4">
                  <h3 className="h6 fw-bold mb-2">{t('verifiedOriginLanding.comparePartnerTitle')}</h3>
                  <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>
                    {t('verifiedOriginLanding.comparePartnerBody')}
                  </p>
                  <Link to="/partners" className="btn btn-sm btn-outline-dark">
                    {t('legal.verifiedVendors.partnerCta')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <p className="small text-muted mt-3 mb-0">{t('verifiedOriginLanding.compareNote')}</p>
        </section>

        <section className="mb-5">
          <div
            className="rounded-3 p-4"
            style={{
              border: '1px solid rgba(200, 170, 80, 0.35)',
              background: 'rgba(255, 252, 245, 0.9)',
            }}
          >
            <h2 className="h6 fw-bold mb-2">{t('verifiedOriginLanding.partnerEmbedTitle')}</h2>
            <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>
              {t('verifiedOriginLanding.partnerEmbedBody')}
            </p>
            <code
              className="d-block small p-3 rounded bg-white border text-break"
              style={{ lineHeight: 1.55 }}
            >
              {`<a href="${publicUrl}">${t('verifiedOriginLanding.partnerEmbedLinkText')}</a>`}
            </code>
          </div>
        </section>

        <section className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div>
            <h2 className="h6 fw-bold mb-1">{t('verifiedOriginLanding.applyCardTitle')}</h2>
            <p className="small text-muted mb-0">{t('verifiedOriginLanding.applyCardBlurb')}</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/marketplace?verifiedOnly=1" className="btn btn-success btn-sm">
              {t('verifiedOriginLanding.ctaBrowse')}
            </Link>
            <Link to="/studio/origin" className="btn btn-dark btn-sm">
              {t('verifiedOriginLanding.ctaApply')}
            </Link>
          </div>
        </section>

        <hr className="my-4" />
        <p className="small text-muted mb-0">
          <Link to="/legal/verified-origin">{t('verifiedOriginLanding.legalLink')}</Link>
        </p>
      </div>
    </div>
  )
}
