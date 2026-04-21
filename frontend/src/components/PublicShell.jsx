import Navbar from './Navbar'

export default function PublicShell({ children }) {
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar variant="public" />
      <main className="flex-grow-1 px-3 py-4">{children}</main>
    </div>
  )
}
