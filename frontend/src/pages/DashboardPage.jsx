import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div>
      <nav className="navbar navbar-dark px-3 px-md-4 py-3"
           style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <span className="navbar-brand fw-bold fs-5">🕷️ TarantulApp</span>
        <div className="d-flex align-items-center gap-3">
          <span className="text-light small d-none d-sm-inline">
            {user?.displayName || user?.email}
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">Mis Tarántulas</h4>
            <p className="text-muted small mb-0">
              Hola{user?.displayName ? `, ${user.displayName}` : ''}! Aquí verás toda tu colección.
            </p>
          </div>
          <button className="btn btn-dark">
            + Agregar tarántula
          </button>
        </div>

        {/* Placeholder: aquí irán las cards de tarántulas en Fase 2 */}
        <div className="row g-3">
          <div className="col-12">
            <div className="card border-dashed text-center py-5 text-muted">
              <div className="fs-1 mb-2">🕸️</div>
              <p className="mb-1 fw-semibold">Todavía no tienes tarántulas registradas</p>
              <p className="small">Agrega la primera para comenzar su expediente.</p>
              <div>
                <button className="btn btn-dark btn-sm">
                  + Agregar primera tarántula
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
