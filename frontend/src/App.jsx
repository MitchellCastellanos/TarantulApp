import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AddTarantulaPage from './pages/AddTarantulaPage'
import TarantulaDetailPage from './pages/TarantulaDetailPage'
import PublicProfilePage from './pages/PublicProfilePage'
import RemindersPage from './pages/RemindersPage'

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
      <Route path="/t/:shortId" element={<PublicProfilePage />} />

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
