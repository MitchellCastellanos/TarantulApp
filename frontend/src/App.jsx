import { useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
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
import QrToolPage from './pages/QrToolPage'
import MarketplacePage from './pages/MarketplacePage'
import MarketplaceKeeperRedirect from './pages/MarketplaceKeeperRedirect'
import LaunchRegistrationPage from './pages/LaunchRegistrationPage'
import { useTranslation } from 'react-i18next'
import AdminPage from './pages/AdminPage'
import SocialHubPage from './pages/SocialHubPage'
import CommunityPostThreadPage from './pages/CommunityPostThreadPage'
import SexIdCasePublicPage from './pages/SexIdCasePublicPage'
import PublicKeeperProfilePage from './pages/PublicKeeperProfilePage'
import HandleSetupPage from './pages/HandleSetupPage'
import { getStoredTheme, setStoredTheme } from './utils/themePreference'
import RateAppPrompt from './components/RateAppPrompt'

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
  const safeHandle = String(user?.publicHandle || '').trim()
  if (!safeHandle && location.pathname !== '/onboarding/handle') {
    return <Navigate to="/onboarding/handle" replace />
  }
  return children
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
      <Route path="/descubrir" element={<DiscoverPage />} />
      <Route path="/descubrir/taxon/:gbifKey" element={<DiscoverTaxonDetailPage />} />
      <Route path="/descubrir/especie/:id" element={<DiscoverSpeciesDetailPage />} />
      <Route path="/descubrir/comparar" element={<DiscoverComparePage />} />
      <Route path="/herramientas/qr" element={<QrToolPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/keeper/:sellerUserId" element={<MarketplaceKeeperRedirect />} />
      <Route path="/launch" element={<LaunchRegistrationPage />} />
      <Route path="/launch_registration" element={<LaunchRegistrationPage />} />
      <Route path="/u/:handle" element={<PublicKeeperProfilePage />} />
      <Route path="/sex-id/:caseId" element={<SexIdCasePublicPage />} />
      <Route path="/onboarding/handle" element={<PrivateRoute><HandleSetupPage /></PrivateRoute>} />

      {/* Protegidas */}
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/tarantulas/new" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id" element={<PrivateRoute><TarantulaDetailPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id/edit" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
      <Route path="/tarantulas/qr-print" element={<PrivateRoute><Navigate to="/herramientas/qr?mode=bulk" replace /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
      <Route path="/community" element={<SocialHubPage />} />
      <Route path="/community/post/:postId" element={<CommunityPostThreadPage />} />
      <Route path="/comunidad" element={<SocialHubPage />} />
      <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Footer() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const socialLinkStyle = {
    color: 'var(--ta-gold)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
  }

  return (
    <footer
      className="text-center py-3 mt-5"
      style={{
        fontSize: '0.78rem',
        color: 'var(--ta-parchment-dk)',
        borderTop: '1px solid var(--ta-border)',
      }}
    >
      <div className="mb-1">
        <a
          href="https://www.instagram.com/tarantulapp_official"
          target="_blank"
          rel="noreferrer"
          style={socialLinkStyle}
          aria-label="Instagram de TarantulApp"
        >
          <i className="bi bi-instagram" aria-hidden="true" />
          <span>@tarantulapp_official</span>
        </a>
        &nbsp;·&nbsp;
        <a
          href="https://www.tiktok.com/@tarantulapp_offic"
          target="_blank"
          rel="noreferrer"
          style={socialLinkStyle}
          aria-label="TikTok de TarantulApp"
        >
          <i className="bi bi-tiktok" aria-hidden="true" />
          <span>@tarantulapp_offic</span>
        </a>
        &nbsp;·&nbsp;
        <a
          href="https://x.com/TarantulApp"
          target="_blank"
          rel="noreferrer"
          style={socialLinkStyle}
          aria-label="X de TarantulApp"
        >
          <i className="bi bi-twitter-x" aria-hidden="true" />
          <span>@TarantulApp</span>
        </a>
      </div>
      <div>
        © {new Date().getFullYear()}{' '}
        <BrandName /> &nbsp;·&nbsp;
        <Link to="/herramientas/qr" style={{ color: 'var(--ta-gold)' }}>{t('nav.qrTool')}</Link>
        &nbsp;·&nbsp;
        <Link to="/about" style={{ color: 'var(--ta-gold)' }}>{t('nav.about')}</Link>
        &nbsp;·&nbsp;
        <Link to={token ? '/comunidad' : '/login'} style={{ color: 'var(--ta-gold)' }}>{t('nav.community')}</Link>
        &nbsp;·&nbsp;
        <Link to="/contact" style={{ color: 'var(--ta-gold)' }}>{t('nav.contact')}</Link>
        &nbsp;·&nbsp;
        <Link to="/privacy" style={{ color: 'var(--ta-gold)' }}>{t('account.legal.privacy')}</Link>
        &nbsp;·&nbsp;
        <Link to="/terms" style={{ color: 'var(--ta-gold)' }}>{t('account.legal.terms')}</Link>
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
        <AuthSessionBridge />
        <AppRoutes />
        <RateAppPrompt />
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}
