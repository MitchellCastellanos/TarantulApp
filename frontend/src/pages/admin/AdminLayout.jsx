import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.admin === true
  const isMarketingOnly = user?.marketingOps === true && !isAdmin
  return (
    <div>
      <Navbar />
      <div className="container-xxl mt-4 mb-5 px-3 px-md-4">
        <h1 className="h4 mb-2">
          {isMarketingOnly ? t('nav.marketingTools', 'Marketing tools') : t('admin.title')}
        </h1>
        <p className="small text-muted mb-3">
          {isMarketingOnly
            ? 'Ad Studio and Partner Outreach. Open Marketing for ads or Partner Outreach for vendor leads.'
            : t('admin.layoutBlurb')}
        </p>
        <ul className="nav nav-pills flex-column flex-sm-row gap-2 mb-4">
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navGeneral')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/vendors"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navVendors')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/marketplace"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navMarketplace')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/partners"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navPartners')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/origin-verifications"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navOriginVerifications')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/labels"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navLabels', 'Labels')}
              </NavLink>
            </li>
          )}
          <li className="nav-item">
            <NavLink
              to="/admin/partner-outreach"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {t('admin.navPartnerOutreach')}
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
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/analytics"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navAnalytics', 'Analytics')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/trade"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navTrade')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/species"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navSpecies', 'Species')}
              </NavLink>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <NavLink
                to="/admin/beta"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {t('admin.navBeta')}
              </NavLink>
            </li>
          )}
        </ul>
        <Outlet />
      </div>
    </div>
  )
}
