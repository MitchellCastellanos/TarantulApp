import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  return (
    <nav className="navbar navbar-dark px-3 px-md-4 py-3"
         style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <Link to="/" className="navbar-brand fw-bold fs-5 text-decoration-none text-white">
        🕷️ TarantulApp
      </Link>
      <div className="d-flex align-items-center gap-3">
        <Link to="/reminders" className="text-light small text-decoration-none d-none d-sm-inline">
          🔔 Recordatorios
        </Link>
        <span className="text-light small d-none d-md-inline">
          {user?.displayName || user?.email}
        </span>
        <button className="btn btn-outline-light btn-sm" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
