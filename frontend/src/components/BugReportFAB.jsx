import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import BugReportModal from './BugReportModal'

export default function BugReportFAB() {
  const { user, token } = useAuth()
  const [open, setOpen] = useState(false)
  const isTester = user?.betaTester === true || user?.isBetaTester === true

  if (!token || !isTester) return null

  return (
    <>
      <button
        type="button"
        className="btn btn-warning rounded-circle shadow position-fixed"
        style={{ right: 16, bottom: 16, width: 52, height: 52, zIndex: 1050 }}
        aria-label="Report bug"
        onClick={() => setOpen(true)}
      >
        <i className="bi bi-bug-fill" />
      </button>
      <BugReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
