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

const SANS_TITLE = {
  fontFamily: "Inter, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  color: 'var(--ta-parchment)',
}

function SectionHeading({ children, className = 'h5 fw-bold mb-3' }) {
  return (
    <h2 className={className} style={SANS_TITLE}>
      {children}
    </h2>
  )
}

function PanelTitle({ children }) {
  return (
    <h3 className="h6 fw-bold mb-2" style={SANS_TITLE}>
      {children}
    </h3>
  )
}

function PremiumCard({ children, className = '' }) {
  return (
    <div className={`card ta-premium-pane border-0 h-100 ${className}`.trim()}>
      <div className="card-body p-4">{children}</div>
    </div>
  )
}

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
              <h1 className="h3 fw-bold mb-3" style={SANS_TITLE}>
                {t('verifiedOriginLanding.heroTitle')}
              </h1>
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
                <Link
                  to="/studio/origin"
                  className="btn btn-sm"
                  style={{
                    border: '1px solid var(--ta-border)',
                    color: 'var(--ta-parchment)',
                    background: 'transparent',
                  }}
                >
                  {t('verifiedOriginLanding.ctaApply')}
                </Link>
              </div>
            </div>
            <div className="col-lg-5">
              <PremiumCard>
                <PanelTitle>{t('verifiedOriginLanding.kindsTitle')}</PanelTitle>
                <p className="small text-muted mb-3">{t('verifiedOriginLanding.kindsBlurb')}</p>
                <div className="d-flex flex-wrap gap-2">
                  {KINDS.map((kind) => (
                    <span key={kind} className="badge border text-body-secondary">
                      {t(`verifiedOrigin.kind.${kind}`)}
                    </span>
                  ))}
                </div>
              </PremiumCard>
            </div>
          </div>
        </header>

        <section className="mb-5">
          <SectionHeading>{t('verifiedOriginLanding.certifiesTitle')}</SectionHeading>
          <div className="row g-3">
            {Array.isArray(certifies)
              ? certifies.map((item) => (
                  <div key={item.title} className="col-md-4">
                    <PremiumCard>
                      <PanelTitle>{item.title}</PanelTitle>
                      <p className="small text-muted mb-0" style={{ lineHeight: 1.6 }}>
                        {item.body}
                      </p>
                    </PremiumCard>
                  </div>
                ))
              : null}
          </div>
        </section>

        <section className="mb-5">
          <PremiumCard>
            <PanelTitle>{t('verifiedOriginLanding.notCertifiesTitle')}</PanelTitle>
            <ul className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.65 }}>
              {Array.isArray(notCertifies) ? notCertifies.map((line) => <li key={line}>{line}</li>) : null}
            </ul>
          </PremiumCard>
        </section>

        <section className="mb-5">
          <SectionHeading>{t('verifiedOriginLanding.howTitle')}</SectionHeading>
          <div className="row g-3">
            {Array.isArray(howSteps)
              ? howSteps.map((step, i) => (
                  <div key={step.title} className="col-md-4">
                    <PremiumCard>
                      <p
                        className="small fw-bold mb-2"
                        style={{ color: 'var(--ta-gold-classic)', letterSpacing: '0.06em' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </p>
                      <PanelTitle>{step.title}</PanelTitle>
                      <p className="small text-muted mb-0" style={{ lineHeight: 1.6 }}>
                        {step.body}
                      </p>
                    </PremiumCard>
                  </div>
                ))
              : null}
          </div>
        </section>

        <section className="mb-5">
          <PremiumCard className="border border-success border-opacity-25">
            <PanelTitle>{t('verifiedOriginLanding.deliveryTitle')}</PanelTitle>
            <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>
              {t('verifiedOriginLanding.deliveryBody')}
            </p>
            <ol className="small text-muted mb-0 ps-3" style={{ lineHeight: 1.65 }}>
              {Array.isArray(deliverySteps) ? deliverySteps.map((line) => <li key={line}>{line}</li>) : null}
            </ol>
          </PremiumCard>
        </section>

        <section className="mb-5">
          <SectionHeading>{t('verifiedOriginLanding.whereTitle')}</SectionHeading>
          <div className="row g-3">
            {SCREENSHOTS.map((shot) => (
              <div key={shot.src} className="col-md-6">
                <div className="card ta-premium-pane border-0 h-100 overflow-hidden">
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
          <SectionHeading>{t('verifiedOriginLanding.compareTitle')}</SectionHeading>
          <div className="row g-3">
            <div className="col-md-6">
              <PremiumCard className="border border-success border-opacity-50">
                <PanelTitle>{t('verifiedOriginLanding.compareVoTitle')}</PanelTitle>
                <p className="small text-muted mb-0" style={{ lineHeight: 1.6 }}>
                  {t('verifiedOriginLanding.compareVoBody')}
                </p>
              </PremiumCard>
            </div>
            <div className="col-md-6">
              <PremiumCard className="border border-warning border-opacity-50">
                <PanelTitle>{t('verifiedOriginLanding.comparePartnerTitle')}</PanelTitle>
                <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>
                  {t('verifiedOriginLanding.comparePartnerBody')}
                </p>
                <Link
                  to="/partners"
                  className="btn btn-sm"
                  style={{
                    border: '1px solid var(--ta-border)',
                    color: 'var(--ta-parchment)',
                    background: 'transparent',
                  }}
                >
                  {t('legal.verifiedVendors.partnerCta')}
                </Link>
              </PremiumCard>
            </div>
          </div>
          <p className="small text-muted mt-3 mb-0">{t('verifiedOriginLanding.compareNote')}</p>
        </section>

        <section className="mb-5">
          <PremiumCard>
            <PanelTitle>{t('verifiedOriginLanding.partnerEmbedTitle')}</PanelTitle>
            <p className="small text-muted mb-3" style={{ lineHeight: 1.6 }}>
              {t('verifiedOriginLanding.partnerEmbedBody')}
            </p>
            <pre
              className="small p-3 rounded border text-break mb-0"
              style={{
                lineHeight: 1.55,
                background: 'rgba(0, 0, 0, 0.28)',
                borderColor: 'var(--ta-border)',
                color: 'var(--ta-text)',
                whiteSpace: 'pre-wrap',
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              }}
            >
              {`<a href="${publicUrl}">${t('verifiedOriginLanding.partnerEmbedLinkText')}</a>`}
            </pre>
          </PremiumCard>
        </section>

        <PremiumCard className="mb-4">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div>
              <PanelTitle>{t('verifiedOriginLanding.applyCardTitle')}</PanelTitle>
              <p className="small text-muted mb-0">{t('verifiedOriginLanding.applyCardBlurb')}</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Link to="/marketplace?verifiedOnly=1" className="btn btn-success btn-sm">
                {t('verifiedOriginLanding.ctaBrowse')}
              </Link>
              <Link
                to="/studio/origin"
                className="btn btn-sm"
                style={{
                  border: '1px solid var(--ta-border)',
                  color: 'var(--ta-parchment)',
                  background: 'transparent',
                }}
              >
                {t('verifiedOriginLanding.ctaApply')}
              </Link>
            </div>
          </div>
        </PremiumCard>

        <p className="small text-muted mb-0">
          <Link to="/legal/verified-origin">{t('verifiedOriginLanding.legalLink')}</Link>
        </p>
      </div>
    </div>
  )
}
