import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import adminService from '../services/adminService'
import {
  loadBetaEmailTemplates,
  saveBetaEmailTemplates,
  resetBetaEmailTemplatesToDefaults,
  newCustomTemplateId,
} from '../utils/betaEmailTemplatesStorage'
import { renderBetaEmailBody } from '../utils/renderBetaEmailBody'
import { buildBetaEmailDocxBlob, downloadBlob } from '../utils/exportBetaEmailDocx'
import {
  cacheBetaPasswordForEmail,
  readCachedBetaPassword,
} from '../utils/betaTesterEmailSession'

const TESTER_TPL_PREF_KEY = 'tarantulapp_tester_email_tpl_v1'

function loadTesterTplPrefs() {
  try {
    const s = localStorage.getItem(TESTER_TPL_PREF_KEY)
    const o = s ? JSON.parse(s) : {}
    return typeof o === 'object' && o !== null ? o : {}
  } catch {
    return {}
  }
}

function formatUsageTime(lastActivityAt, t) {
  if (!lastActivityAt) return t('admin.usageTimeNever')
  const ts = new Date(lastActivityAt).getTime()
  if (Number.isNaN(ts)) return '-'
  const diffMs = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('admin.usageTimeNow')
  if (minutes < 60) return t('admin.usageTimeMinutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('admin.usageTimeHours', { count: hours })
  const days = Math.floor(hours / 24)
  return t('admin.usageTimeDays', { count: days })
}

export default function AdminPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [reports, setReports] = useState([])
  const [officialVendors, setOfficialVendors] = useState([])
  const [officialLeads, setOfficialLeads] = useState([])
  const [bugReports, setBugReports] = useState([])
  const [betaTesters, setBetaTesters] = useState([])
  const [betaApplications, setBetaApplications] = useState([])
  const [betaStats, setBetaStats] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [partnerSyncLoading, setPartnerSyncLoading] = useState(false)
  const [partnerSyncMessage, setPartnerSyncMessage] = useState('')
  const [reviewingApplicationId, setReviewingApplicationId] = useState('')
  const [passwordUser, setPasswordUser] = useState(null)
  const [resetPass, setResetPass] = useState({ newPassword: '', generate: false })
  const [resetPassLoading, setResetPassLoading] = useState(false)
  const [prov, setProv] = useState({ identifier: '', displayName: '', newPassword: '', generate: false })
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [mailStatus, setMailStatus] = useState(null)
  const [mailTestTo, setMailTestTo] = useState('')
  const [mailTestLoading, setMailTestLoading] = useState(false)
  const [betaEmailTemplates, setBetaEmailTemplates] = useState(() => loadBetaEmailTemplates())
  const [testerTplPref, setTesterTplPref] = useState(() => loadTesterTplPrefs())
  const [tplEditor, setTplEditor] = useState(null)
  const [approvalEmailBundle, setApprovalEmailBundle] = useState(null)
  const [approvalTplId, setApprovalTplId] = useState('builtin-welcome-es')

  const updateTesterPref = (userId, templateId) => {
    setTesterTplPref((prev) => {
      const n = { ...prev, [userId]: templateId }
      try {
        localStorage.setItem(TESTER_TPL_PREF_KEY, JSON.stringify(n))
      } catch {
        /* ignore */
      }
      return n
    })
  }

  const getTemplateForTester = (userId) => {
    const id = testerTplPref[userId] || betaEmailTemplates[0]?.id
    return betaEmailTemplates.find((x) => x.id === id) || betaEmailTemplates[0]
  }

  const resolvePasswordForEmail = (email) => {
    const c = readCachedBetaPassword(email)
    if (c) return c
    const p = typeof window !== 'undefined' ? window.prompt(t('admin.welcomeEmailPasswordPrompt'), '') : ''
    if (p === null) return null
    return (p || '').trim() || null
  }

  const duplicateBuiltinToCustom = (tpl, openEditorAfter) => {
    setBetaEmailTemplates((prev) => {
      const body = renderBetaEmailBody(tpl, {
        name: '{{name}}',
        email: '{{email}}',
        password: '{{password}}',
        appUrl: '{{appUrl}}',
        sendDate: '{{sendDate}}',
      })
      const row = {
        id: newCustomTemplateId(),
        label: `${tpl.label} (custom)`,
        locale: tpl.locale,
        kind: 'custom',
        body,
      }
      const next = [...prev, row]
      saveBetaEmailTemplates(next)
      if (openEditorAfter) {
        queueMicrotask(() => setTplEditor(row))
      }
      return next
    })
  }

  const addCustomTemplate = () => {
    const row = {
      id: newCustomTemplateId(),
      label: 'Nueva plantilla',
      locale: 'es',
      kind: 'custom',
      body:
        'Hola {{name}},\n\nCorreo: {{email}}\nContraseña: {{password}}\nApp: {{appUrl}}\nFecha: {{sendDate}}\n',
    }
    setBetaEmailTemplates((prev) => {
      const next = [...prev, row]
      saveBetaEmailTemplates(next)
      return next
    })
    setTplEditor(row)
  }

  const deleteTemplate = (id) => {
    if (!window.confirm(t('admin.betaEmailTemplateDeleteConfirm'))) return
    setBetaEmailTemplates((prev) => {
      const next = prev.filter((x) => x.id !== id)
      saveBetaEmailTemplates(next)
      return next
    })
  }

  const resetTemplatesToDefaults = () => {
    if (!window.confirm(t('admin.betaEmailTemplatesResetConfirm'))) return
    resetBetaEmailTemplatesToDefaults()
    setBetaEmailTemplates(loadBetaEmailTemplates())
  }

  const saveTemplateEditor = () => {
    if (!tplEditor) return
    const row = { ...tplEditor, kind: 'custom' }
    setBetaEmailTemplates((prev) => {
      const exists = prev.some((x) => x.id === row.id)
      const next = exists ? prev.map((x) => (x.id === row.id ? row : x)) : [...prev, row]
      saveBetaEmailTemplates(next)
      return next
    })
    setTplEditor(null)
  }

  const copyTesterEmail = async (u) => {
    const pwd = resolvePasswordForEmail(u.email)
    if (pwd === null) return
    const tpl = getTemplateForTester(u.id)
    const body = renderBetaEmailBody(tpl, {
      name: u.displayName || u.email,
      email: u.email,
      password: pwd || '[PASSWORD]',
    })
    try {
      await navigator.clipboard.writeText(body)
      window.alert(t('admin.welcomeEmailCopied'))
    } catch {
      window.alert(t('admin.welcomeEmailCopyFailed'))
    }
  }

  const downloadTesterWord = async (u) => {
    const pwd = resolvePasswordForEmail(u.email)
    if (pwd === null) return
    const tpl = getTemplateForTester(u.id)
    const body = renderBetaEmailBody(tpl, {
      name: u.displayName || u.email,
      email: u.email,
      password: pwd || '[PASSWORD]',
    })
    try {
      const blob = await buildBetaEmailDocxBlob({ bodyText: body })
      const safe = (u.email || 'tester').split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
      downloadBlob(blob, `tarantulapp-beta-email-${safe}.docx`)
    } catch (e) {
      console.error(e)
      window.alert(t('admin.betaEmailWordFailed'))
    }
  }

  const copyApprovalBundleEmail = () => {
    if (!approvalEmailBundle) return
    const tpl = betaEmailTemplates.find((x) => x.id === approvalTplId) || betaEmailTemplates[0]
    const body = renderBetaEmailBody(tpl, {
      name: approvalEmailBundle.name || approvalEmailBundle.email,
      email: approvalEmailBundle.email,
      password: approvalEmailBundle.password,
    })
    navigator.clipboard.writeText(body).then(
      () => window.alert(t('admin.welcomeEmailCopied')),
      () => window.alert(t('admin.welcomeEmailCopyFailed')),
    )
  }

  const downloadApprovalWord = async () => {
    if (!approvalEmailBundle) return
    const tpl = betaEmailTemplates.find((x) => x.id === approvalTplId) || betaEmailTemplates[0]
    const body = renderBetaEmailBody(tpl, {
      name: approvalEmailBundle.name || approvalEmailBundle.email,
      email: approvalEmailBundle.email,
      password: approvalEmailBundle.password,
    })
    try {
      const blob = await buildBetaEmailDocxBlob({ bodyText: body })
      const safe = (approvalEmailBundle.email || 'tester').split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_')
      downloadBlob(blob, `tarantulapp-beta-email-${safe}.docx`)
    } catch (e) {
      console.error(e)
      window.alert(t('admin.betaEmailWordFailed'))
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminService.summary(),
      adminService.recentUsers(),
      adminService.reports('open'),
      adminService.officialVendors(),
      adminService.officialVendorLeads(),
      adminService.bugReports('open'),
      adminService.betaTesters(),
      adminService.betaApplications('pending'),
      adminService.betaStats(),
      adminService.mailConfigStatus().catch(() => null),
    ])
      .then(([s, users, openReports, vendors, leads, bugs, testers, applications, stats, mailCfg]) => {
        if (cancelled) return
        setSummary(s)
        setRecentUsers(Array.isArray(users) ? users : [])
        setReports(Array.isArray(openReports) ? openReports : [])
        setOfficialVendors(Array.isArray(vendors) ? vendors : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
        setBugReports(Array.isArray(bugs) ? bugs : [])
        setBetaTesters(Array.isArray(testers) ? testers : [])
        setBetaApplications(Array.isArray(applications) ? applications : [])
        setBetaStats(stats && typeof stats === 'object' ? stats : null)
        setMailStatus(mailCfg && typeof mailCfg === 'object' ? mailCfg : null)
      })
      .catch((err) => {
        if (cancelled) return
        const code = err?.response?.status
        setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const resolveReport = async (id, action) => {
    try {
      await adminService.resolveReport(id, action, '')
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const patchBugReport = async (id, status) => {
    try {
      const updated = await adminService.patchBugReport(id, { status })
      setBugReports((prev) => prev.map((b) => (b.id === id ? updated : b)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const toggleBetaTester = async (id, nextValue) => {
    try {
      const updated = await adminService.patchUserBeta(id, { isBetaTester: nextValue })
      if (!nextValue) {
        setBetaTesters((prev) => prev.filter((u) => String(u.id) !== String(id)))
        return
      }
      setBetaTesters((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const reviewApplication = async (id, action) => {
    setReviewingApplicationId(String(id))
    try {
      const data = await adminService.reviewBetaApplication(id, {
        action,
        generatePassword: action === 'approve',
      })
      setBetaApplications((prev) => prev.filter((a) => String(a.id) !== String(id)))
      setSuccess(action === 'approve' ? t('admin.betaApplicationApproved') : t('admin.betaApplicationRejected'))
      if (action === 'approve') {
        const refreshed = await adminService.betaTesters()
        setBetaTesters(Array.isArray(refreshed) ? refreshed : [])
        if (data?.plainPassword && data?.email) {
          cacheBetaPasswordForEmail(data.email, data.plainPassword)
          setApprovalTplId('builtin-welcome-es')
          setApprovalEmailBundle({
            password: data.plainPassword,
            email: data.email,
            name: data.name || data.approvedUser?.displayName || '',
          })
        }
      }
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setReviewingApplicationId('')
    }
  }

  const toggleRecentUserTester = async (u) => {
    try {
      const nextValue = !(u?.isBetaTester === true)
      await adminService.patchUserBeta(u.id, { isBetaTester: nextValue })
      setRecentUsers((prev) =>
        prev.map((row) => (String(row.id) === String(u.id) ? { ...row, isBetaTester: nextValue } : row)),
      )
      const refreshed = await adminService.betaTesters()
      setBetaTesters(Array.isArray(refreshed) ? refreshed : [])
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const submitPasswordReset = async () => {
    if (!passwordUser) return
    setResetPassLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await adminService.setUserPassword(passwordUser.id, {
        newPassword: resetPass.generate ? undefined : resetPass.newPassword,
        generatePassword: resetPass.generate,
      })
      setPasswordUser(null)
      if (res.plainPassword) {
        cacheBetaPasswordForEmail(res.user?.email || passwordUser.email, res.plainPassword)
        setSuccess(
          t('admin.addTesterPasswordShown', {
            email: res.user?.email || passwordUser.email,
            password: res.plainPassword,
          }),
        )
      } else {
        setSuccess(t('admin.passwordUpdated'))
      }
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setResetPassLoading(false)
    }
  }

  const submitProvision = async (e) => {
    e.preventDefault()
    if (!prov.identifier?.trim()) return
    setProvisionLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await adminService.provisionTester({
        identifier: prov.identifier.trim(),
        newPassword: prov.generate ? undefined : prov.newPassword,
        generatePassword: prov.generate,
        displayName: prov.displayName?.trim() || undefined,
      })
      const list = await adminService.betaTesters()
      setBetaTesters(Array.isArray(list) ? list : [])
      if (res.plainPassword) {
        cacheBetaPasswordForEmail(res.user.email, res.plainPassword)
        setSuccess(
          t('admin.addTesterPasswordShown', { email: res.user.email, password: res.plainPassword }),
        )
      } else {
        setSuccess(t('admin.testerUpdated'))
      }
      setProv({ identifier: '', displayName: '', newPassword: '', generate: false })
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setProvisionLoading(false)
    }
  }

  const hideActionForReport = (report) => {
    if (report?.targetType === 'marketplace_listing') return 'hide_listing'
    if (report?.targetType === 'activity_post') return 'hide_activity_post'
    if (report?.targetType === 'keeper_profile') return 'hide_keeper_profile'
    return 'hide_tarantula'
  }

  const toggleOfficialVendor = async (vendorId, nextEnabled) => {
    try {
      const updated = await adminService.setOfficialVendorStatus(vendorId, nextEnabled)
      setOfficialVendors((prev) => prev.map((v) => (v.id === vendorId ? updated : v)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const patchVendorStrategic = async (vendorId, body) => {
    try {
      const updated = await adminService.updateOfficialVendorStrategicProgram(vendorId, body)
      setOfficialVendors((prev) => prev.map((v) => (String(v.id) === String(vendorId) ? updated : v)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const runPartnerSyncNow = async () => {
    setPartnerSyncLoading(true)
    setPartnerSyncMessage('')
    setError('')
    try {
      const runs = await adminService.runPartnerSync()
      const n = Array.isArray(runs) ? runs.length : 0
      setPartnerSyncMessage(t('admin.partnerSyncDone', { count: n }))
    } catch {
      setError(t('admin.partnerSyncError'))
    } finally {
      setPartnerSyncLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 980 }}>
        <h1 className="h4 mb-3">{t('admin.title')}</h1>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {partnerSyncMessage && <div className="alert alert-success small py-2">{partnerSyncMessage}</div>}

        {mailStatus && (
          <div className={`card p-3 mb-3 ${mailStatus.usernameConfigured ? 'border-secondary' : 'border-warning'}`}>
            <h2 className="h6 mb-2">{t('admin.mailSmtpCardTitle')}</h2>
            <p className="small text-muted mb-2">{t('admin.mailSmtpCardBlurb')}</p>
            <ul className="small mb-2">
              <li>
                <strong>SMTP host:</strong> {mailStatus.host} · <strong>port:</strong> {mailStatus.port}
              </li>
              <li>
                <strong>{t('admin.mailFromLabel')}:</strong> {mailStatus.fromAddress}
              </li>
              <li>
                <strong>{t('admin.mailUserConfigured')}:</strong>{' '}
                {mailStatus.usernameConfigured ? t('share.yes') : t('share.no')}
              </li>
            </ul>
            {!mailStatus.usernameConfigured ? (
              <div className="alert alert-warning small py-2 mb-2">{t('admin.mailSmtpMissingCreds')}</div>
            ) : null}
            <div className="d-flex flex-wrap gap-2 align-items-end">
              <div className="flex-grow-1" style={{ minWidth: 220 }}>
                <label className="form-label small mb-0" htmlFor="mail-test-to">
                  {t('admin.mailTestToLabel')}
                </label>
                <input
                  id="mail-test-to"
                  type="email"
                  className="form-control form-control-sm"
                  value={mailTestTo}
                  onChange={(e) => setMailTestTo(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={mailTestLoading || !mailTestTo.trim()}
                onClick={async () => {
                  setMailTestLoading(true)
                  setError('')
                  setSuccess('')
                  try {
                    await adminService.mailTestSend(mailTestTo.trim())
                    setSuccess(t('admin.mailTestSent'))
                  } catch {
                    setError(t('admin.mailTestFailed'))
                  } finally {
                    setMailTestLoading(false)
                  }
                }}
              >
                {mailTestLoading ? t('common.loading') : t('admin.mailTestSend')}
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.usersTotal')}</small><div className="h5 mb-0">{summary.usersTotal}</div></div></div>
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.users7d')}</small><div className="h5 mb-0">{summary.usersLast7d}</div></div></div>
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.tarantulas')}</small><div className="h5 mb-0">{summary.tarantulasTotal}</div></div></div>
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.pendingReminders')}</small><div className="h5 mb-0">{summary.remindersPending}</div></div></div>
          </div>
        )}

        <div className="card p-3">
          <h2 className="h6 mb-3">{t('admin.recentUsers')}</h2>
          {recentUsers.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.noUsers')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.name')}</th>
                    <th>{t('admin.plan')}</th>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.usageTime')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.displayName || '-'}</td>
                      <td>{u.plan}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                      <td>{formatUsageTime(u.lastActivityAt, t)}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.isBetaTester ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleRecentUserTester(u)}
                        >
                          {u.isBetaTester ? t('admin.removeTester') : t('admin.makeTester')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3 border-warning">
          <h2 className="h6 mb-2">{t('admin.strategicPartnerSectionTitle')}</h2>
          <p className="small text-muted mb-3">{t('admin.strategicPartnerSectionBlurb')}</p>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={partnerSyncLoading}
            onClick={() => runPartnerSyncNow()}
          >
            {partnerSyncLoading ? t('admin.partnerSyncRunning') : t('admin.runPartnerSync')}
          </button>
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.officialVendorsTitle')}</h2>
          {officialVendors.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.officialVendorsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.officialVendorsColBrand')}</th>
                    <th>{t('admin.officialVendorsColLocation')}</th>
                    <th>{t('admin.officialVendorsColScore')}</th>
                    <th>{t('admin.officialVendorsColStatus')}</th>
                    <th className="text-center">{t('admin.officialVendorsColFounder')}</th>
                    <th className="text-center">{t('admin.officialVendorsColImport')}</th>
                    <th>{t('admin.officialVendorsColActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {officialVendors.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="fw-semibold">{v.name}</div>
                        <div className="small text-muted">{v.websiteUrl}</div>
                      </td>
                      <td>{[v.city, v.state, v.country].filter(Boolean).join(' · ') || '-'}</td>
                      <td>{v.influenceScore ?? 0}</td>
                      <td>{v.enabled ? t('admin.officialVendorsActive') : t('admin.officialVendorsHidden')}</td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          title="STRATEGIC_FOUNDER"
                          checked={v.partnerProgramTier === 'STRATEGIC_FOUNDER'}
                          onChange={(e) => patchVendorStrategic(v.id, { strategicFounder: e.target.checked })}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={!!v.listingImportEnabled}
                          onChange={(e) => patchVendorStrategic(v.id, { listingImportEnabled: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${v.enabled ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleOfficialVendor(v.id, !v.enabled)}
                        >
                          {v.enabled ? t('admin.officialVendorsDeactivate') : t('admin.officialVendorsActivate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.officialLeadsTitle')}</h2>
          {officialLeads.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.officialLeadsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Marca</th>
                    <th>Contacto</th>
                    <th>Cobertura</th>
                    <th>Notas</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {officialLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <div className="fw-semibold">{lead.businessName}</div>
                        <div className="small text-muted">{lead.websiteUrl || '-'}</div>
                      </td>
                      <td>
                        <div>{lead.contactName || '-'}</div>
                        <div className="small text-muted">{lead.contactEmail}</div>
                      </td>
                      <td>{[lead.city, lead.state, lead.country].filter(Boolean).join(' · ') || '-'}</td>
                      <td>{lead.note || '-'}</td>
                      <td>{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.betaBugReportsTitle')}</h2>
          {bugReports.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.betaBugReportsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.severity')}</th>
                    <th>{t('admin.betaBugTitle')}</th>
                    <th>{t('admin.page')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bugReports.map((b) => (
                    <tr key={b.id}>
                      <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'}</td>
                      <td>{b.severity || '-'}</td>
                      <td>{b.title || '-'}</td>
                      <td className="small text-muted">{b.currentUrl || '-'}</td>
                      <td className="d-flex flex-wrap gap-1">
                        <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => patchBugReport(b.id, 'in_progress')}>In progress</button>
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => patchBugReport(b.id, 'fixed')}>Fixed</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => patchBugReport(b.id, 'wont_fix')}>Won't fix</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.betaTestersTitle')}</h2>
          <div className="border rounded p-2 mb-3 bg-body-secondary bg-opacity-10">
            <h3 className="h6 mb-2">{t('admin.betaEmailTemplatesTitle')}</h3>
            <p className="small text-muted mb-2">{t('admin.betaEmailTemplatesBlurb')}</p>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-2">
                <thead>
                  <tr>
                    <th>{t('admin.betaEmailTemplateColName')}</th>
                    <th>{t('admin.betaEmailTemplateColLocale')}</th>
                    <th>{t('admin.betaEmailTemplateColKind')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaEmailTemplates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td className="small">{tpl.label}</td>
                      <td>{tpl.locale?.toUpperCase()}</td>
                      <td className="small">{tpl.kind}</td>
                      <td className="d-flex flex-wrap gap-1">
                        {tpl.kind === 'builtin' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => duplicateBuiltinToCustom(tpl, false)}
                          >
                            {t('admin.betaEmailTemplateDuplicate')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setTplEditor({ ...tpl })}
                          >
                            {t('admin.betaEmailTemplateEdit')}
                          </button>
                        )}
                        {tpl.kind === 'custom' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteTemplate(tpl.id)}
                          >
                            {t('admin.betaEmailTemplateDelete')}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-success" onClick={addCustomTemplate}>
                {t('admin.betaEmailTemplateAdd')}
              </button>
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={resetTemplatesToDefaults}>
                {t('admin.betaEmailTemplatesReset')}
              </button>
            </div>
            <p className="small text-muted mb-0 mt-2">{t('admin.betaEmailTemplatesHint')}</p>
          </div>
          <p className="small text-muted mb-2">{t('admin.addTesterBlurb')}</p>
          <form
            onSubmit={submitProvision}
            className="p-2 mb-3 border rounded bg-body-secondary bg-opacity-10"
            style={{ maxWidth: 540 }}
          >
            <h3 className="h6 mb-2">{t('admin.addTesterTitle')}</h3>
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label small mb-0" htmlFor="ad-prov-id">
                  {t('admin.identifierLabel')}
                </label>
                <input
                  id="ad-prov-id"
                  className="form-control form-control-sm"
                  value={prov.identifier}
                  onChange={(e) => setProv((p) => ({ ...p, identifier: e.target.value }))}
                  autoComplete="off"
                />
                <p className="form-text text-muted small mb-0 mt-1">{t('admin.identifierHint')}</p>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small mb-0" htmlFor="ad-prov-name">
                  {t('admin.displayNameOptional')}
                </label>
                <input
                  id="ad-prov-name"
                  className="form-control form-control-sm"
                  value={prov.displayName}
                  onChange={(e) => setProv((p) => ({ ...p, displayName: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-check my-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="ad-prov-gen"
                checked={prov.generate}
                onChange={(e) => setProv((p) => ({ ...p, generate: e.target.checked }))}
              />
              <label className="form-check-label small" htmlFor="ad-prov-gen">
                {t('admin.generatePassword')}
              </label>
            </div>
            {!prov.generate && (
              <div className="mb-2" style={{ maxWidth: 320 }}>
                <label className="form-label small mb-0" htmlFor="ad-prov-pass">
                  {t('admin.newPasswordLabel')}
                </label>
                <input
                  id="ad-prov-pass"
                  type="password"
                  className="form-control form-control-sm"
                  value={prov.newPassword}
                  onChange={(e) => setProv((p) => ({ ...p, newPassword: e.target.value }))}
                  minLength={6}
                  autoComplete="new-password"
                />
                <p className="form-text text-muted small mb-0 mt-1">{t('admin.passwordOrGenerate')}</p>
              </div>
            )}
            <button
              type="submit"
              className="btn btn-sm btn-success"
              disabled={provisionLoading}
            >
              {provisionLoading ? t('common.loading') : t('admin.addTesterSubmit')}
            </button>
          </form>
          {betaTesters.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.betaTestersEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('auth.email')}</th>
                    <th>{t('admin.country')}</th>
                    <th>{t('admin.level')}</th>
                    <th>{t('admin.betaBugReportsTitle')}</th>
                    <th>{t('admin.betaEmailTemplateColName')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaTesters.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.betaCountry || '-'}</td>
                      <td>{u.betaExperienceLevel || '-'}</td>
                      <td>{u.bugReportsCount ?? 0}</td>
                      <td style={{ minWidth: 180 }}>
                        <select
                          className="form-select form-select-sm"
                          aria-label={t('admin.betaEmailSelectTemplate')}
                          value={testerTplPref[u.id] || betaEmailTemplates[0]?.id || ''}
                          onChange={(e) => updateTesterPref(u.id, e.target.value)}
                        >
                          {betaEmailTemplates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.label} ({tpl.locale?.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setPasswordUser({ id: u.id, email: u.email })
                              setResetPass({ newPassword: '', generate: false })
                            }}
                          >
                            {t('admin.resetPasswordButton')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => copyTesterEmail(u)}
                          >
                            {t('admin.betaEmailCopy')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => downloadTesterWord(u)}
                          >
                            {t('admin.betaEmailWord')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => toggleBetaTester(u.id, false)}
                          >
                            {t('admin.removeTester')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {betaStats && (
          <div className="card p-3 mt-3">
            <h2 className="h6 mb-3">{t('admin.betaStatsTitle')}</h2>
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsTotal')}</small>
                  <div className="h5 mb-0">{betaStats.total ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsPending')}</small>
                  <div className="h5 mb-0">{betaStats.pending ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsApproved')}</small>
                  <div className="h5 mb-0">{betaStats.approved ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsRejected')}</small>
                  <div className="h5 mb-0">{betaStats.rejected ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsLast7d')}</small>
                  <div className="h5 mb-0">{betaStats.last7d ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsLast30d')}</small>
                  <div className="h5 mb-0">{betaStats.last30d ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsActiveTesters')}</small>
                  <div className="h5 mb-0">{betaStats.activeTesters ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsApprovalRate')}</small>
                  <div className="h5 mb-0">{betaStats.approvalRatePct ?? 0}%</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsBugsOpen')}</small>
                  <div className="h5 mb-0">{betaStats.bugReportsOpen ?? 0}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-2">
                  <small className="text-muted">{t('admin.betaStatsBugsTotal')}</small>
                  <div className="h5 mb-0">{betaStats.bugReportsTotal ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <h3 className="h6 mb-2">{t('admin.betaStatsByCountry')}</h3>
                {Array.isArray(betaStats.byCountry) && betaStats.byCountry.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('admin.country')}</th>
                          <th className="text-end">{t('admin.betaStatsTotal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {betaStats.byCountry.map((row) => (
                          <tr key={`country-${row.country}`}>
                            <td>{row.country === 'unknown' ? t('admin.betaStatsUnknown') : row.country}</td>
                            <td className="text-end">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">{t('admin.betaApplicationsEmpty')}</p>
                )}
              </div>
              <div className="col-12 col-md-6">
                <h3 className="h6 mb-2">{t('admin.betaStatsByExperience')}</h3>
                {Array.isArray(betaStats.byExperience) && betaStats.byExperience.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('admin.level')}</th>
                          <th className="text-end">{t('admin.betaStatsTotal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {betaStats.byExperience.map((row) => (
                          <tr key={`exp-${row.level}`}>
                            <td>{row.level === 'unknown' ? t('admin.betaStatsUnknown') : row.level}</td>
                            <td className="text-end">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">{t('admin.betaApplicationsEmpty')}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.betaApplicationsTitle')}</h2>
          {betaApplications.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.betaApplicationsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.name')}</th>
                    <th>{t('admin.country')}</th>
                    <th>{t('admin.level')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaApplications.map((a) => (
                    <tr key={a.id}>
                      <td>{a.email}</td>
                      <td>{a.name || '-'}</td>
                      <td>{a.country || '-'}</td>
                      <td>{a.experienceLevel || '-'}</td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          disabled={reviewingApplicationId === String(a.id)}
                          onClick={() => reviewApplication(a.id, 'approve')}
                        >
                          {reviewingApplicationId === String(a.id) ? t('common.loading') : t('admin.approve')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={reviewingApplicationId === String(a.id)}
                          onClick={() => reviewApplication(a.id, 'reject')}
                        >
                          {reviewingApplicationId === String(a.id) ? t('common.loading') : t('admin.reject')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.openReports')}</h2>
          {reports.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.noReports')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.target')}</th>
                    <th>{t('admin.targetType')}</th>
                    <th>{t('admin.reason')}</th>
                    <th>{t('admin.details')}</th>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.targetRef || r.targetId || '-'}</td>
                      <td className="text-muted small">{r.targetType || '-'}</td>
                      <td>{r.reason}</td>
                      <td>{r.details || '-'}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => resolveReport(r.id, hideActionForReport(r))}
                        >
                          {t('admin.hidePublic')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light"
                          onClick={() => resolveReport(r.id, 'dismiss')}
                        >
                          {t('admin.dismiss')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {approvalEmailBundle ? (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content p-3">
              <h3 className="h6 mb-3">{t('admin.approvalEmailModalTitle')}</h3>
              <p className="small mb-2">
                <strong>{t('auth.email')}:</strong> {approvalEmailBundle.email}
              </p>
              <p className="small mb-3">
                <strong>{t('admin.newPasswordLabel')}:</strong>{' '}
                <code className="user-select-all">{approvalEmailBundle.password}</code>
              </p>
              <label className="form-label small" htmlFor="approval-tpl">
                {t('admin.betaEmailSelectTemplate')}
              </label>
              <select
                id="approval-tpl"
                className="form-select form-select-sm mb-3"
                value={approvalTplId}
                onChange={(e) => setApprovalTplId(e.target.value)}
              >
                {betaEmailTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label} ({tpl.locale?.toUpperCase()})
                  </option>
                ))}
              </select>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(approvalEmailBundle.password).then(
                      () => window.alert(t('admin.approvalPasswordCopied')),
                      () => window.alert(t('admin.welcomeEmailCopyFailed')),
                    )
                  }}
                >
                  {t('admin.approvalCopyPassword')}
                </button>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={copyApprovalBundleEmail}>
                  {t('admin.betaEmailCopy')}
                </button>
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={downloadApprovalWord}>
                  {t('admin.betaEmailWord')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light ms-auto"
                  onClick={() => setApprovalEmailBundle(null)}
                >
                  {t('common.done')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {tplEditor ? (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content p-3">
              <h3 className="h6 mb-3">{t('admin.betaEmailTemplateEdit')}</h3>
              <div className="mb-2">
                <label className="form-label small" htmlFor="tpl-label">
                  {t('admin.betaEmailTemplateColName')}
                </label>
                <input
                  id="tpl-label"
                  className="form-control form-control-sm"
                  value={tplEditor.label}
                  onChange={(e) => setTplEditor((x) => ({ ...x, label: e.target.value }))}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small" htmlFor="tpl-locale">
                  {t('admin.betaEmailTemplateColLocale')}
                </label>
                <select
                  id="tpl-locale"
                  className="form-select form-select-sm"
                  value={tplEditor.locale}
                  onChange={(e) =>
                    setTplEditor((x) => ({ ...x, locale: e.target.value === 'en' ? 'en' : 'es' }))
                  }
                >
                  <option value="es">ES</option>
                  <option value="en">EN</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small" htmlFor="tpl-body">
                  {t('admin.betaEmailTemplateBody')}
                </label>
                <textarea
                  id="tpl-body"
                  className="form-control font-monospace small"
                  rows={16}
                  value={tplEditor.body || ''}
                  onChange={(e) => setTplEditor((x) => ({ ...x, body: e.target.value }))}
                />
              </div>
              <p className="small text-muted">{t('admin.betaEmailTemplatesHint')}</p>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-sm btn-light" onClick={() => setTplEditor(null)}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-sm btn-primary" onClick={saveTemplateEditor}>
                  {t('admin.betaEmailTemplateSave')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {passwordUser ? (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <h3 className="h6 mb-3">
                {t('admin.resetPasswordTitle', { email: passwordUser.email })}
              </h3>
              <div className="form-check mb-2">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="ad-reset-gen"
                  checked={resetPass.generate}
                  onChange={(e) => setResetPass((p) => ({ ...p, generate: e.target.checked }))}
                />
                <label className="form-check-label small" htmlFor="ad-reset-gen">
                  {t('admin.generatePassword')}
                </label>
              </div>
              {!resetPass.generate && (
                <div className="mb-3">
                  <label className="form-label small" htmlFor="ad-reset-pass">
                    {t('admin.newPasswordLabel')}
                  </label>
                  <input
                    id="ad-reset-pass"
                    type="password"
                    className="form-control"
                    value={resetPass.newPassword}
                    onChange={(e) => setResetPass((p) => ({ ...p, newPassword: e.target.value }))}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              )}
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => setPasswordUser(null)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={resetPassLoading}
                  onClick={submitPasswordReset}
                >
                  {resetPassLoading ? t('common.loading') : t('admin.setPasswordSubmit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
