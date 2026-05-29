import { Suspense } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useCapabilities } from '../hooks/useCapabilities'

export default function StudioLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { data: capabilities, isPending } = useCapabilities()
  const bootstrapping = isPending && !capabilities

  if (bootstrapping) {
    return (
      <div>
        <Navbar />
        <div className="container py-4"><p>{t('common.loading')}</p></div>
      </div>
    )
  }

  const canAccess = capabilities?.passportCreator || capabilities?.studio

  if (!canAccess) {
    return (
      <div>
        <Navbar />
        <div className="container py-4" style={{ maxWidth: 560 }}>
          <div className="card p-3">
            <h1 className="h5">{t('studio.title')}</h1>
            <p className="small text-muted mb-0">{t('studio.notEnabled')}</p>
          </div>
        </div>
      </div>
    )
  }

  const tabClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`
  const outletKey = `${location.pathname}${location.search}`

  return (
    <div>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 900 }}>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
          <div>
            <h1 className="h4 mb-1">{t('studio.title')}</h1>
            <p className="small text-muted mb-0">{t('studio.subtitle')}</p>
          </div>
        </div>

        <ul className="nav nav-pills flex-wrap gap-2 mb-4">
          <li className="nav-item">
            <NavLink to="/studio" end className={tabClass}>
              {t('studio.navBatches')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/studio/passports" className={tabClass}>
              {t('studio.navPassports')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/studio/labels" className={tabClass}>
              {t('studio.navLabels')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/studio/origin" className={tabClass}>
              {t('studio.navOrigin')}
            </NavLink>
          </li>
          <li className="nav-item">
            <Link to="/marketplace/sell" className="nav-link">
              {t('studio.navListings')}
            </Link>
          </li>
        </ul>

        <Suspense fallback={<p className="small text-muted mb-0">{t('common.loading')}</p>}>
          <Outlet key={outletKey} />
        </Suspense>
      </div>
    </div>
  )
}
