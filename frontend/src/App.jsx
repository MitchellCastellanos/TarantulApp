import { useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setUnauthorizedHandler } from './services/authSession'
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
import KeeperProfilePage from './pages/KeeperProfilePage'
import { useTranslation } from 'react-i18next'
import AdminPage from './pages/AdminPage'
import SocialHubPage from './pages/SocialHubPage'
import SexIdCasePublicPage from './pages/SexIdCasePublicPage'
import { getStoredTheme, setStoredTheme } from './utils/themePreference'

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
  const { token } = useAuth()
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
      <Route path="/marketplace/keeper/:sellerUserId" element={<KeeperProfilePage />} />
      <Route path="/sex-id/:caseId" element={<SexIdCasePublicPage />} />

      {/* Protegidas */}
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/tarantulas/new" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id" element={<PrivateRoute><TarantulaDetailPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id/edit" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
      <Route path="/tarantulas/qr-print" element={<PrivateRoute><Navigate to="/herramientas/qr?mode=bulk" replace /></PrivateRoute>} />
      <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
      <Route path="/comunidad" element={<PrivateRoute><SocialHubPage /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Footer() {
  const { t } = useTranslation()
  const { token } = useAuth()
  return (
    <footer
      className="text-center py-3 mt-5"
      style={{
        fontSize: '0.78rem',
        color: 'var(--ta-parchment-dk)',
        borderTop: '1px solid var(--ta-border)',
      }}
    >
      © {new Date().getFullYear()} TarantulApp &nbsp;·&nbsp;
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
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}
