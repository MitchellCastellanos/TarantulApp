import Navbar from '../components/Navbar'
import { useTranslation } from 'react-i18next'
import { PUBLIC_CONTACT } from '../constants/publicContact'

function ContactBlock({ title, body, email }) {
  return (
    <div
      className="rounded-3 p-3 p-md-4 mb-3"
      style={{
        border: '1px solid rgba(200, 170, 80, 0.35)',
        background: 'rgba(30, 26, 18, 0.45)',
      }}
    >
      <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{title}</h2>
      <p className="small mb-2" style={{ color: 'var(--ta-text)' }}>{body}</p>
      <a
        href={`mailto:${email}`}
        className="small fw-semibold text-decoration-none"
        style={{ color: 'var(--ta-gold)' }}
      >
        {email}
      </a>
    </div>
  )
}

export default function ContactPage() {
  const { t } = useTranslation()
  const contactBlocks = [
    { title: t('contact.helloTitle'), body: t('contact.helloBody'), email: PUBLIC_CONTACT.hello },
    { title: t('contact.supportTitle'), body: t('contact.supportBody'), email: PUBLIC_CONTACT.support },
    { title: t('contact.billingTitle'), body: t('contact.billingBody'), email: PUBLIC_CONTACT.billing },
    { title: t('contact.marketplaceTitle'), body: t('contact.marketplaceBody'), email: PUBLIC_CONTACT.marketplace },
    { title: t('contact.communityTitle'), body: t('contact.communityBody'), email: PUBLIC_CONTACT.community },
    { title: t('contact.newsletterTitle'), body: t('contact.newsletterBody'), email: PUBLIC_CONTACT.newsletter },
    { title: t('contact.trustTitle'), body: t('contact.trustBody'), email: PUBLIC_CONTACT.trust },
    { title: t('contact.legalTitle'), body: t('contact.legalBody'), email: PUBLIC_CONTACT.legal },
    { title: t('contact.partnersTitle'), body: t('contact.partnersBody'), email: PUBLIC_CONTACT.partners },
    { title: t('contact.platformOpsTitle'), body: t('contact.platformOpsBody'), email: PUBLIC_CONTACT.platformOps },
    { title: t('contact.marketingTitle'), body: t('contact.marketingBody'), email: PUBLIC_CONTACT.marketing },
  ]

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 640 }}>
        <h1 className="fw-bold mb-2">{t('contact.title')}</h1>
        <p className="text-muted small mb-4">{t('contact.intro')}</p>

        {contactBlocks.map((item) => (
          <ContactBlock key={item.email} title={item.title} body={item.body} email={item.email} />
        ))}
      </div>
    </div>
  )
}
