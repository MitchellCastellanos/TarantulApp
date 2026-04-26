import './utils/publicAssets.js'
import { initObservability, Sentry } from './utils/observability.js'

initObservability()

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import './i18n/index.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={({ resetError }) => (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Algo salió mal / Something went wrong</h1>
        <p>El equipo ya fue notificado. / The team has been notified.</p>
        <button onClick={resetError}>Reintentar / Retry</button>
      </div>
    )}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
