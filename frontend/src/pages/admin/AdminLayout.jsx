import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'

export default function AdminLayout() {
  const { t } = useTranslation()
  return (
    <div>
      <Navbar />
      <div className="container-xxl mt-4 mb-5 px-3 px-md-4">
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
              to="/admin/vendors"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navVendors')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/marketplace"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navMarketplace')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/marketing"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navMarketing')}
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/trade"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navTrade')}
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
