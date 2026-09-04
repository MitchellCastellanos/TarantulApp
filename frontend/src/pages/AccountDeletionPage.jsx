import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import BrandName from '../components/BrandName'
import { DEFAULT_SUPPORT_EMAIL } from '../constants/publicContact'
import { publicAccountDeletionArticleUrl, publicAccountSettingsUrl } from '../utils/publicSiteUrl'
import { usePageSeo } from '../hooks/usePageSeo'
import { BRAND_WITH_TM } from '../constants/brand'

export default function AccountDeletionPage() {
  const { t } = useTranslation()
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL
  usePageSeo({
    title: `${t('accountDeletion.title')} · ${BRAND_WITH_TM}`,
    description: t('accountDeletion.intro'),
    canonicalHref: publicAccountDeletionArticleUrl(),
  })

  return (
    <div className="ta-premium-page">
      <Navbar variant="public" />
      <div className="container mt-4 mb-5 ta-premium-shell" style={{ maxWidth: 720 }}>
        <ChitinCardFrame showSilhouettes={false} className="ta-premium-pane">
          <h1 className="h3 fw-bold mb-2 ta-premium-title">{t('accountDeletion.title')}</h1>
          <p className="small text-muted mb-4">
            {t('accountDeletion.canonicalUrlLabel')}{' '}
            <span className="user-select-all">{publicAccountDeletionArticleUrl()}</span>
          </p>
          <p className="mb-3" style={{ lineHeight: 1.6 }}>
            {t('accountDeletion.intro')}
          </p>
          <ol className="small mb-4" style={{ lineHeight: 1.65 }}>
            <li className="mb-2">{t('accountDeletion.step1')}</li>
            <li className="mb-2">{t('accountDeletion.step2')}</li>
            <li className="mb-2">{t('accountDeletion.step3')}</li>
            <li className="mb-2">{t('accountDeletion.step4')}</li>
          </ol>
          <div className="d-flex flex-wrap gap-2 mb-4">
            <Link className="btn btn-sm btn-dark" to="/login">
              {t('accountDeletion.ctaLogin')}
            </Link>
            <Link className="btn btn-sm btn-outline-secondary" to="/account">
              {t('accountDeletion.ctaAccount')}
            </Link>
          </div>
          <p className="small text-muted mb-2">{t('accountDeletion.urlsNote')}</p>
          <ul className="small text-muted mb-4">
            <li>
              <span className="user-select-all">{publicAccountSettingsUrl()}</span>
            </li>
            <li>
              <span className="user-select-all">{publicAccountDeletionArticleUrl()}</span>
            </li>
          </ul>
          <p className="small mb-0">
            {t('accountDeletion.supportFallback')}{' '}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} style={{ color: 'var(--ta-gold)' }}>
                {supportEmail}
              </a>
            ) : (
              <Link to="/contact">{t('nav.contact')}</Link>
            )}
            .
          </p>
          <p className="small text-muted mt-3 mb-0">
            <BrandName /> — {t('accountDeletion.playDataNote')}
          </p>
        </ChitinCardFrame>
      </div>
    </div>
  )
}
