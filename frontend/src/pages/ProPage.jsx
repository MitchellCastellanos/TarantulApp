import Navbar from '../components/Navbar'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

export default function ProPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const plan = user?.plan || 'FREE'

  const isPro = plan === 'PRO'

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 720 }}>
        <div className="mb-3">
          <span className="badge bg-dark me-2">TarantulApp</span>
          <span className={`badge ${isPro ? 'bg-success' : 'bg-secondary'}`}>
            {isPro ? t('pro.currentPro') : t('pro.currentFree')}
          </span>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h4 className="fw-bold mb-2">{t('pro.title')}</h4>
            <p className="text-muted mb-3">{t('pro.subtitle')}</p>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="border rounded p-3 h-100">
                  <h6 className="fw-bold mb-2">{t('pro.freeTitle')}</h6>
                  <ul className="small mb-0">
                    <li>{t('pro.freeLimit')}</li>
                    <li>{t('pro.freeReminders')}</li>
                    <li>{t('pro.freeQr')}</li>
                  </ul>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border border-dark rounded p-3 h-100 position-relative">
                  <span className="badge bg-dark position-absolute" style={{ top: -10, right: 12 }}>
                    PRO
                  </span>
                  <h6 className="fw-bold mb-2">{t('pro.proTitle')}</h6>
                  <ul className="small mb-0">
                    <li>{t('pro.proUnlimited')}</li>
                    <li>{t('pro.proAutoReminders')}</li>
                    <li>{t('pro.proQrActions')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold mb-2">{t('pro.statusTitle')}</h6>
            <p className="small text-muted mb-3">
              {isPro ? t('pro.statusPro') : t('pro.statusFree')}
            </p>
            {!isPro && (
              <p className="small mb-0">
                {t('pro.soonPayments')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

