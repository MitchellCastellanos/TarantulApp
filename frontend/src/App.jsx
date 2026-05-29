import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlayStoreGateProvider } from './context/PlayStoreGateContext'
import { setUnauthorizedHandler } from './services/authSession'
import BrandName from './components/BrandName'
import ScrollToTop from './components/ScrollToTop'
// Eager: critical first paint surfaces (login + public discovery + branding shell)
import LoginPage from './pages/LoginPage'
import DiscoverPage from './pages/DiscoverPage'
import { useTranslation } from 'react-i18next'
import { getStoredTheme, setStoredTheme } from './utils/themePreference'
import RateAppPrompt from './components/RateAppPrompt'
import AndroidUpdateBanner from './components/AndroidUpdateBanner'
import PlayStoreWebBanner from './components/PlayStoreWebBanner'
import BugReportFAB from './components/BugReportFAB'
import BetaTesterAgreementModal from './components/BetaTesterAgreementModal'
import KeeperGamificationCelebrationHost from './components/KeeperGamificationCelebrationHost'
import { isInviteOnlyEnabled } from './utils/inviteOnly'
// Eager: Studio shell tabs must not suspend the whole router when switching sub-nav.
import StudioLayout from './pages/StudioLayout'
import StudioPage from './pages/StudioPage'
import StudioBatchPage from './pages/StudioBatchPage'
import StudioPassportsPage from './pages/StudioPassportsPage'
import StudioOriginPage from './pages/StudioOriginPage'

// Lazy-loaded routes — each becomes its own JS chunk and only downloads when visited.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AddTarantulaPage = lazy(() => import('./pages/AddTarantulaPage'))
const TarantulaDetailPage = lazy(() => import('./pages/TarantulaDetailPage'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'))
const RemindersPage = lazy(() => import('./pages/RemindersPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const ProPage = lazy(() => import('./pages/ProPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VendorInvitePage = lazy(() => import('./pages/VendorInvitePage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const AccountDeletionPage = lazy(() => import('./pages/AccountDeletionPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const MarketplacePolicyPage = lazy(() => import('./pages/MarketplacePolicyPage'))
const LegalVerifiedVendorsPage = lazy(() => import('./pages/LegalVerifiedVendorsPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const DiscoverTaxonDetailPage = lazy(() => import('./pages/DiscoverTaxonDetailPage'))
const DiscoverSpeciesDetailPage = lazy(() => import('./pages/DiscoverSpeciesDetailPage'))
const DiscoverComparePage = lazy(() => import('./pages/DiscoverComparePage'))
const DiscoverCatalogBrowsePage = lazy(() => import('./pages/DiscoverCatalogBrowsePage'))
const QrToolPage = lazy(() => import('./pages/QrToolPage'))
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'))
const MarketplaceListingDetailPage = lazy(() => import('./pages/MarketplaceListingDetailPage'))
const MarketplaceMessagesPage = lazy(() => import('./pages/MarketplaceMessagesPage'))
const MarketplaceSellerPage = lazy(() => import('./pages/MarketplaceSellerPage'))
const MarketplaceStorefrontPage = lazy(() => import('./pages/MarketplaceStorefrontPage'))
const PartnerStorefrontPage = lazy(() => import('./pages/PartnerStorefrontPage'))
const BecomePartnerPage = lazy(() => import('./pages/BecomePartnerPage'))
const MarketplaceKeeperRedirect = lazy(() => import('./pages/MarketplaceKeeperRedirect'))
const LaunchRegistrationPage = lazy(() => import('./pages/LaunchRegistrationPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'))
const AdminBetaPage = lazy(() => import('./pages/admin/AdminBetaPage'))
const AdminVendorsPage = lazy(() => import('./pages/admin/AdminVendorsPage'))
const AdminMarketplacePage = lazy(() => import('./pages/admin/AdminMarketplacePage'))
const AdminPartnerDashboardPage = lazy(() => import('./pages/admin/AdminPartnerDashboardPage'))
const AdminOriginVerificationsPage = lazy(() => import('./pages/admin/AdminOriginVerificationsPage'))
const PartnerHubPage = lazy(() => import('./pages/PartnerHubPage'))
const AdminPartnerOutreachPage = lazy(() => import('./pages/admin/AdminPartnerOutreachPage'))
const AdminMarketingPage = lazy(() => import('./pages/admin/AdminMarketingPage'))
const AdminSpeciesTradePage = lazy(() => import('./pages/admin/AdminSpeciesTradePage'))
const SexIdPage = lazy(() => import('./pages/SexIdPage'))
const SexIdCasePublicPage = lazy(() => import('./pages/SexIdCasePublicPage'))
const PublicKeeperProfilePage = lazy(() => import('./pages/PublicKeeperProfilePage'))
const HandleSetupPage = lazy(() => import('./pages/HandleSetupPage'))
const BetaApplyPage = lazy(() => import('./pages/BetaApplyPage'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const WishlistPage = lazy(() => import('./pages/WishlistPage'))
const PublicBetaHomePage = lazy(() => import('./pages/PublicBetaHomePage'))
const BetaPendingHomePage = lazy(() => import('./pages/BetaPendingHomePage'))

/** Registra cierre de sesión por 401 sin recargar la página (la consola conserva el error). */
function AuthSessionBridge() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  // useLayoutEffect: antes que useEffect de rutas hijas y sin ventana Strict Mode donde handler=null → fallback que borra token sin logout().
  useLayoutEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [logout, navigate])
  return null
}

function PrivateRoute({ children }) {
  const { token, user } = useAuth()
  const location = useLocation()
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ redirectAfterAuth: location.pathname + location.search }}
      />
    )
  }
  if (isInviteOnlyEnabled()) {
    const hasAppAccess =
      user?.betaTester === true || user?.admin === true || user?.marketingOps === true
    if (!hasAppAccess) {
      return <Navigate to="/" replace />
    }
  }
  const safeHandle = String(user?.publicHandle || '').trim()
  if (!safeHandle && location.pathname !== '/onboarding/handle') {
    return <Navigate to="/onboarding/handle" replace />
  }
  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (user?.admin === true || user?.marketingOps === true) {
    return children
  }
  return <Navigate to="/" replace />
}

function AdminOnlyRoute({ children }) {
  const { user } = useAuth()
  if (user?.admin === true) {
    return children
  }
  return <Navigate to="/admin/marketing" replace />
}

function HomeGate() {
  const { token, user } = useAuth()
  const inviteOnly = isInviteOnlyEnabled()
  if (!token) {
    return inviteOnly ? <PublicBetaHomePage /> : <Navigate to="/login" replace />
  }
  if (inviteOnly) {
    const hasAppAccess =
      user?.betaTester === true || user?.admin === true || user?.marketingOps === true
    if (!hasAppAccess) {
      return <BetaPendingHomePage />
    }
  }
  if (user?.marketingOps === true && user?.admin !== true) {
    return <Navigate to="/admin/marketing" replace />
  }
  return <DashboardPage />
}

function LoginGate() {
  const { token, user } = useAuth()
  const location = useLocation()
  if (token) {
    let r = location.state?.redirectAfterAuth
    if (typeof r !== 'string' || !r.startsWith('/')) {
      try {
        const s = sessionStorage.getItem('ta_post_login_redirect')
        if (s && typeof s === 'string' && s.startsWith('/')) {
          sessionStorage.removeItem('ta_post_login_redirect')
          r = s
        }
      } catch (_) {
        /* ignore */
      }
    }
    if (typeof r === 'string' && r.startsWith('/')) {
      return <Navigate to={r} replace />
    }
    if (user?.marketingOps === true && user?.admin !== true) {
      return <Navigate to="/admin/marketing" replace />
    }
    return <Navigate to="/" replace />
  }
  return <LoginPage />
}

function LegacyPathRedirect({ to }) {
  const location = useLocation()
  const params = useParams()
  const resolvedTo = Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, encodeURIComponent(String(value ?? ''))),
    to,
  )
  return <Navigate to={`${resolvedTo}${location.search || ''}`} replace />
}

function LabelStudioLegacyRedirect() {
  const location = useLocation()
  return <Navigate to={`/studio/labels${location.search || ''}`} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<LoginGate />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/vendor-invite" element={<VendorInvitePage />} />
      <Route path="/t/:shortId" element={<PublicProfilePage />} />
      <Route path="/pro" element={<ProPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/account-deletion" element={<AccountDeletionPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/marketplace-policy" element={<MarketplacePolicyPage />} />
      <Route path="/legal/verified-vendors" element={<LegalVerifiedVendorsPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/discover/catalog" element={<DiscoverCatalogBrowsePage />} />
      <Route path="/discover/taxon/:gbifKey" element={<DiscoverTaxonDetailPage />} />
      <Route path="/discover/species/:id" element={<DiscoverSpeciesDetailPage />} />
      <Route path="/discover/compare" element={<DiscoverComparePage />} />
      <Route path="/descubrir" element={<LegacyPathRedirect to="/discover" />} />
      <Route path="/descubrir/taxon/:gbifKey" element={<LegacyPathRedirect to="/discover/taxon/:gbifKey" />} />
      <Route path="/descubrir/especie/:id" element={<LegacyPathRedirect to="/discover/species/:id" />} />
      <Route path="/descubrir/comparar" element={<LegacyPathRedirect to="/discover/compare" />} />
      <Route path="/studio" element={<PrivateRoute><StudioLayout /></PrivateRoute>}>
        <Route index element={<StudioPage />} />
        <Route path="passports" element={<StudioPassportsPage />} />
        <Route path="batches/:batchId" element={<StudioBatchPage />} />
        <Route path="labels" element={<QrToolPage />} />
        <Route path="origin" element={<StudioOriginPage />} />
      </Route>
      <Route path="/tools/qr" element={<LabelStudioLegacyRedirect />} />
      <Route path="/tools/labels" element={<LabelStudioLegacyRedirect />} />
      <Route path="/herramientas/qr" element={<LabelStudioLegacyRedirect />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/listing/:listingId" element={<MarketplaceListingDetailPage />} />
      <Route path="/shop/:handle" element={<MarketplaceStorefrontPage />} />
      <Route path="/partner/hub" element={<PrivateRoute><PartnerHubPage /></PrivateRoute>} />
      <Route path="/partner/:slug" element={<PartnerStorefrontPage />} />
      <Route path="/partners" element={<BecomePartnerPage />} />
      <Route path="/marketplace/messages" element={<PrivateRoute><MarketplaceMessagesPage /></PrivateRoute>} />
      <Route path="/marketplace/sell" element={<PrivateRoute><MarketplaceSellerPage /></PrivateRoute>} />
      <Route path="/marketplace/keeper/:sellerUserId" element={<MarketplaceKeeperRedirect />} />
      <Route path="/launch" element={<LaunchRegistrationPage />} />
      <Route path="/launch_registration" element={<LaunchRegistrationPage />} />
      <Route path="/beta/apply" element={<BetaApplyPage />} />
      <Route path="/u/:handle" element={<PublicKeeperProfilePage />} />
      <Route path="/sex-id" element={<SexIdPage />} />
      <Route path="/sex-id/:caseId" element={<SexIdCasePublicPage />} />
      <Route path="/onboarding/handle" element={<PrivateRoute><HandleSetupPage /></PrivateRoute>} />

      {/* Protegidas */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/tarantulas/new" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id" element={<PrivateRoute><TarantulaDetailPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id/edit" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
      <Route path="/insights" element={<PrivateRoute><InsightsPage /></PrivateRoute>} />
      <Route path="/tarantulas/qr-print" element={<PrivateRoute><Navigate to="/studio/labels?mode=bulk" replace /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/wishlist" element={<PrivateRoute><WishlistPage /></PrivateRoute>} />
      {/* Community paused: redirect legacy routes to the dashboard. */}
      <Route path="/community" element={<Navigate to="/" replace />} />
      <Route path="/community/post/:postId" element={<Navigate to="/" replace />} />
      <Route path="/comunidad" element={<Navigate to="/" replace />} />
      <Route path="/admin" element={<PrivateRoute><AdminRoute><AdminLayout /></AdminRoute></PrivateRoute>}>
        <Route index element={<AdminOnlyRoute><AdminHomePage /></AdminOnlyRoute>} />
        <Route path="vendors" element={<AdminOnlyRoute><AdminVendorsPage /></AdminOnlyRoute>} />
        <Route path="marketplace" element={<AdminOnlyRoute><AdminMarketplacePage /></AdminOnlyRoute>} />
        <Route path="partners" element={<AdminOnlyRoute><AdminPartnerDashboardPage /></AdminOnlyRoute>} />
        <Route path="origin-verifications" element={<AdminOnlyRoute><AdminOriginVerificationsPage /></AdminOnlyRoute>} />
        <Route path="partner-outreach" element={<AdminPartnerOutreachPage />} />
        <Route path="marketing" element={<AdminMarketingPage />} />
        <Route path="trade" element={<AdminOnlyRoute><AdminSpeciesTradePage /></AdminOnlyRoute>} />
        <Route path="beta" element={<AdminOnlyRoute><AdminBetaPage /></AdminOnlyRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="ta-app-footer text-center py-3 mt-5">
      <div className="mb-1">
        <a
          href="https://www.instagram.com/tarantulapp_official"
          target="_blank"
          rel="noreferrer"
          className="ta-app-footer__social"
          aria-label="Instagram de TarantulApp"
        >
          <i className="bi bi-instagram" aria-hidden="true" />
          <span>@tarantulapp_official</span>
        </a>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>
        <a
          href="https://www.tiktok.com/@tarantulapp_offic"
          target="_blank"
          rel="noreferrer"
          className="ta-app-footer__social"
          aria-label="TikTok de TarantulApp"
        >
          <i className="bi bi-tiktok" aria-hidden="true" />
          <span>@tarantulapp_offic</span>
        </a>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>
        <a
          href="https://x.com/TarantulApp"
          target="_blank"
          rel="noreferrer"
          className="ta-app-footer__social"
          aria-label="X de TarantulApp"
        >
          <i className="bi bi-twitter-x" aria-hidden="true" />
          <span>@TarantulApp</span>
        </a>
      </div>
      <div>
        © {new Date().getFullYear()}{' '}
        <BrandName />{' '}
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/studio/labels">{t('nav.qrTool')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/about">{t('nav.about')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/contact">{t('nav.contact')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/privacy">{t('account.legal.privacy')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/account-deletion">{t('nav.accountDeletion')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/terms">{t('account.legal.terms')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/marketplace-policy">{t('legal.marketplacePolicy.title')}</Link>
      </div>
    </footer>
  )
}

export default function App() {
  useEffect(() => {
    setStoredTheme(getStoredTheme())
  }, [])

  return (
    <AuthProvider>
      <PlayStoreGateProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthSessionBridge />
          <KeeperGamificationCelebrationHost />
          <ScrollToTop />
          <PlayStoreWebBanner />
          <Suspense fallback={null}>
            <AppRoutes />
          </Suspense>
          <BugReportFAB />
          <BetaTesterAgreementModal />
          <AndroidUpdateBanner />
          <RateAppPrompt />
          <Footer />
        </BrowserRouter>
      </PlayStoreGateProvider>
    </AuthProvider>
  )
}
