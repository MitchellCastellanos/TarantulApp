import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AddTarantulaPage from './pages/AddTarantulaPage'
import TarantulaDetailPage from './pages/TarantulaDetailPage'
import PublicProfilePage from './pages/PublicProfilePage'
import RemindersPage from './pages/RemindersPage'
import ProPage from './pages/ProPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { token } = useAuth()
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/t/:shortId" element={<PublicProfilePage />} />
      <Route path="/pro" element={<ProPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Protegidas */}
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/tarantulas/new" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id" element={<PrivateRoute><TarantulaDetailPage /></PrivateRoute>} />
      <Route path="/tarantulas/:id/edit" element={<PrivateRoute><AddTarantulaPage /></PrivateRoute>} />
      <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Footer() {
  return (
    <footer className="text-center py-3 mt-5" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
      © {new Date().getFullYear()} TarantulApp &nbsp;·&nbsp;
      <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.4)' }}>Privacy Policy</Link>
      &nbsp;·&nbsp;
      <Link to="/terms" style={{ color: 'rgba(255,255,255,0.4)' }}>Terms</Link>
    </footer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  )
}
