import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setUnauthorizedHandler } from './services/authSession'
import BrandName from './components/BrandName'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AddTarantulaPage from './pages/AddTarantulaPage'
import TarantulaDetailPage from './pages/TarantulaDetailPage'
import PublicProfilePage from './pages/PublicProfilePage'
import RemindersPage from './pages/RemindersPage'
import AccountPage from './pages/AccountPage'
import ProPage from './pages/ProPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ContactPage from './pages/ContactPage'
import AboutPage from './pages/AboutPage'
import DiscoverPage from './pages/DiscoverPage'
import DiscoverTaxonDetailPage from './pages/DiscoverTaxonDetailPage'
import DiscoverSpeciesDetailPage from './pages/DiscoverSpeciesDetailPage'
import DiscoverComparePage from './pages/DiscoverComparePage'
import DiscoverCatalogBrowsePage from './pages/DiscoverCatalogBrowsePage'
import QrToolPage from './pages/QrToolPage'
import MarketplacePage from './pages/MarketplacePage'
import MarketplaceListingDetailPage from './pages/MarketplaceListingDetailPage'
import MarketplaceMessagesPage from './pages/MarketplaceMessagesPage'
import MarketplaceSellerPage from './pages/MarketplaceSellerPage'
import MarketplaceKeeperRedirect from './pages/MarketplaceKeeperRedirect'
import LaunchRegistrationPage from './pages/LaunchRegistrationPage'
import { useTranslation } from 'react-i18next'
import AdminLayout from './pages/admin/AdminLayout'
import AdminHomePage from './pages/admin/AdminHomePage'
import AdminBetaPage from './pages/admin/AdminBetaPage'
import SocialHubPage from './pages/SocialHubPage'
import CommunityPostThreadPage from './pages/CommunityPostThreadPage'
import SexIdCasePublicPage from './pages/SexIdCasePublicPage'
import PublicKeeperProfilePage from './pages/PublicKeeperProfilePage'
import HandleSetupPage from './pages/HandleSetupPage'
import BetaApplyPage from './pages/BetaApplyPage'
import { getStoredTheme, setStoredTheme } from './utils/themePreference'
import RateAppPrompt from './components/RateAppPrompt'
import ComingSoonPage from './pages/ComingSoonPage'
import InsightsPage from './pages/InsightsPage'
import NotificationsPage from './pages/NotificationsPage'
import BugReportFAB from './components/BugReportFAB'
import BetaTesterAgreementModal from './components/BetaTesterAgreementModal'
import PublicBetaHomePage from './pages/PublicBetaHomePage'
import BetaPendingHomePage from './pages/BetaPendingHomePage'
import {
  COMING_SOON_BYPASS_STORAGE_KEY,
  isComingSoonEnabled,
  readTesterBypass,
  writeTesterPrefill,
  writeTesterBypass,
} from './utils/comingSoonGate'
import { isInviteOnlyEnabled } from './utils/inviteOnly'

function ComingSoonGate({ children }) {
  const enabled = isComingSoonEnabled()
  const [unlocked, setUnlocked] = useState(() => readTesterBypass())
  const location = useLocation()

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== COMING_SOON_BYPASS_STORAGE_KEY) return
      setUnlocked(e.newValue === '1')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleTesterUnlock = useCallback((prefill) => {
    if (prefill?.email && prefill?.password) {
      writeTesterPrefill(prefill.email, prefill.password)
    }
    writeTesterBypass()
    setUnlocked(true)
  }, [])

  const isPublicBypassPath = location.pathname === '/beta/apply'

  if (!enabled || unlocked || isPublicBypassPath) {
    return children
  }
  return <ComingSoonPage onUnlock={handleTesterUnlock} />
}

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
    const isBeta = user?.betaTester === true || user?.admin === true
    if (!isBeta) {
      return <Navigate to="/" replace />
    }
  }
  const safeHandle = String(user?.publicHandle || '').trim()
  if (!safeHandle && location.pathname !== '/onboarding/handle') {
    return <Navigate to="/onboarding/handle" replace />
  }
  return children
}

function HomeGate() {
  const { token, user } = useAuth()
  const inviteOnly = isInviteOnlyEnabled()
  if (!token) {
    return inviteOnly ? <PublicBetaHomePage /> : <Navigate to="/login" replace />
  }
  if (inviteOnly) {
    const isBeta = user?.betaTester === true || user?.admin === true
    if (!isBeta) {
      return <BetaPendingHomePage />
    }
  }
  return <DashboardPage />
}

function LoginGate() {
  const { token } = useAuth()
  const location = useLocation()
  if (token) {
    const r = location.state?.redirectAfterAuth
    if (typeof r === 'string' && r.startsWith('/')) {
      return <Navigate to={r} replace />
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

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<LoginGate />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/t/:shortId" element={<PublicProfilePage />} />
      <Route path="/pro" element={<ProPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
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
      <Route path="/tools/qr" element={<QrToolPage />} />
      <Route path="/herramientas/qr" element={<LegacyPathRedirect to="/tools/qr" />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/listing/:listingId" element={<MarketplaceListingDetailPage />} />
      <Route path="/marketplace/messages" element={<PrivateRoute><MarketplaceMessagesPage /></PrivateRoute>} />
      <Route path="/marketplace/sell" element={<PrivateRoute><MarketplaceSellerPage /></PrivateRoute>} />
      <Route path="/marketplace/keeper/:sellerUserId" element={<MarketplaceKeeperRedirect />} />
      <Route path="/launch" element={<LaunchRegistrationPage />} />
      <Route path="/launch_registration" element={<LaunchRegistrationPage />} />
      <Route path="/beta/apply" element={<BetaApplyPage />} />
      <Route path="/u/:handle" element={<PublicKeeperProfilePage />} />
      <Route path="/sex-id/:caseId" element={<SexIdCasePublicPage />} />
      <Route path="/onboarding/handle" element={<PrivateRoute><HandleSetupPage /></PrivateRoute>} />

      {/* Protegidas */}
      <Route path="/" element={<HomeGate />} />
      <Route path="/tarantulas/new" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id" element={<PrivateRoute><TarantulaDetailPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id/edit" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
      <Route path="/insights" element={<PrivateRoute><InsightsPage /></PrivateRoute>} />
      <Route path="/tarantulas/qr-print" element={<PrivateRoute><Navigate to="/tools/qr?mode=bulk" replace /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/community" element={<SocialHubPage />} />
      <Route path="/community/post/:postId" element={<CommunityPostThreadPage />} />
      <Route path="/comunidad" element={<LegacyPathRedirect to="/community" />} />
      <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminHomePage />} />
        <Route path="beta" element={<AdminBetaPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Footer() {
  const { t } = useTranslation()
  const { token } = useAuth()

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
        <Link to="/tools/qr">{t('nav.qrTool')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to="/about">{t('nav.about')}</Link>
        <span className="ta-app-footer__dot" aria-hidden>
          ·
        </span>{' '}
        <Link to={token ? '/community' : '/login'}>{t('nav.community')}</Link>
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
        <Link to="/terms">{t('account.legal.terms')}</Link>
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
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ComingSoonGate>
          <AuthSessionBridge />
          <AppRoutes />
          <BugReportFAB />
          <BetaTesterAgreementModal />
          <RateAppPrompt />
          <Footer />
        </ComingSoonGate>
      </BrowserRouter>
    </AuthProvider>
  )
}
