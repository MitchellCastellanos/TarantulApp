import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'

export default function AdminLayout() {
  const { t } = useTranslation()
  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 980 }}>
        <h1 className="h4 mb-2">{t('admin.title')}</h1>
        <p className="small text-muted mb-3">{t('admin.layoutBlurb')}</p>
        <ul className="nav nav-pills flex-column flex-sm-row gap-2 mb-4">
          <li className="nav-item">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navGeneral')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/beta"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navBeta')}
            </NavLink>
          </li>
        </ul>
        <Outlet />
      </div>
    </div>
  )
}
