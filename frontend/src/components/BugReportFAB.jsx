import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import BugReportModal from './BugReportModal'
import './BugReportFAB.css'

export default function BugReportFAB() {
  const { user, token } = useAuth()
  const [open, setOpen] = useState(false)
  const isTester = user?.betaTester === true || user?.isBetaTester === true

  if (!token || !isTester) return null

  return (
    <>
      <button
        type="button"
        className="btn btn-warning rounded-circle shadow ta-bug-report-fab"
        aria-label="Report bug"
        onClick={() => setOpen(true)}
      >
        <i className="bi bi-bug-fill" />
      </button>
      <BugReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
