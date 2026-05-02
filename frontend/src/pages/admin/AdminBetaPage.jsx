import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import {
  loadBetaEmailTemplates,
  saveBetaEmailTemplates,
  resetBetaEmailTemplatesToDefaults,
  newCustomTemplateId,
} from '../../utils/betaEmailTemplatesStorage'
import { renderBetaEmailBody } from '../../utils/renderBetaEmailBody'
import { buildBetaEmailDocxBlob, downloadBlob } from '../../utils/exportBetaEmailDocx'
import {
  cacheBetaPasswordForEmail,
  readCachedBetaPassword,
} from '../../utils/betaTesterEmailSession'
import {
  loadTesterTplPrefs,
  TESTER_TPL_PREF_KEY,
  formatUsageTime,
  userActivityTier,
  activityStatusLabel,
  activityStatusBadgeClass,
  formatAdminPlanSummary,
  adminPlanBadgeClass,
  adminSpiderCount,
  compareAdminByActivityDesc,
  compareAdminByCreatedDesc,
} from './adminShared'

function formatBetaBugSeverity(severity, t) {
  if (!severity) return '-'
  const k = String(severity).toLowerCase()
  const keys = {
    low: 'admin.severityLow',
    medium: 'admin.severityMedium',
    high: 'admin.severityHigh',
    critical: 'admin.severityCritical',
  }
  const tk = keys[k]
  return tk ? t(tk) : severity
}

export default function AdminBetaPage() {
  const { t, i18n } = useTranslation()
  const [bugReports, setBugReports] = useState([])
  const [betaTesters, setBetaTesters] = useState([])
  const [betaApplications, setBetaApplications] = useState([])
  const [betaStats, setBetaStats] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reviewingApplicationId, setReviewingApplicationId] = useState('')
  const [passwordUser, setPasswordUser] = useState(null)
  const [resetPass, setResetPass] = useState({ newPassword: '', generate: false })
  const [resetPassLoading, setResetPassLoading] = useState(false)
  const [prov, setProv] = useState({ identifier: '', displayName: '', newPassword: '', generate: true })
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionWelcomeModal, setProvisionWelcomeModal] = useState(null)
  const [provisionWelcomeSending, setProvisionWelcomeSending] = useState(false)
  const [betaEmailTemplates, setBetaEmailTemplates] = useState(() => loadBetaEmailTemplates())
  const [testerTplPref, setTesterTplPref] = useState(() => loadTesterTplPrefs())
  const [tplEditor, setTplEditor] = useState(null)
  const [approveSendWelcome, setApproveSendWelcome] = useState(true)
  const [approveWelcomeLocale, setApproveWelcomeLocale] = useState('es')
  const [campaignCatalog, setCampaignCatalog] = useState([])
  const [campaignKey, setCampaignKey] = useState('week_1')
  const [campaignLocale, setCampaignLocale] = useState('es')
  const [campaignSending, setCampaignSending] = useState(false)
  const [selectedTesterIds, setSelectedTesterIds] = useState(() => ({}))
  const [testerListSort, setTesterListSort] = useState('activity')

  const sortedBetaTesters = useMemo(() => {
    const rows = [...betaTesters]
    if (testerListSort === 'email') {
      rows.sort((a, b) => (a.email || '').localeCompare(b.email || '', undefined, { sensitivity: 'base' }))
    } else if (testerListSort === 'created') {
      rows.sort(compareAdminByCreatedDesc)
    } else {
      rows.sort(compareAdminByActivityDesc)
    }
    return rows
  }, [betaTesters, testerListSort])

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

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminService.bugReports('open'),
      adminService.betaTesters(),
      adminService.betaApplications('pending'),
      adminService.betaStats(),
    ])
      .then(([bugs, testers, applications, stats]) => {
        if (cancelled) return
        setBugReports(Array.isArray(bugs) ? bugs : [])
        setBetaTesters(Array.isArray(testers) ? testers : [])
        setBetaApplications(Array.isArray(applications) ? applications : [])
        setBetaStats(stats && typeof stats === 'object' ? stats : null)
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

  useEffect(() => {
    adminService
      .betaCampaignCatalog()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setCampaignCatalog(rows)
          setCampaignKey(rows[0].key)
        }
      })
      .catch(() => {
        /* non-blocking */
      })
  }, [])

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
    setError('')
    try {
      const data = await adminService.reviewBetaApplication(id, {
        action,
        generatePassword: action === 'approve',
        sendWelcomeEmail: action === 'approve' ? approveSendWelcome : undefined,
        welcomeLocale: action === 'approve' ? approveWelcomeLocale : undefined,
      })
      setBetaApplications((prev) => prev.filter((a) => String(a.id) !== String(id)))
      if (action === 'approve') {
        let msg = t('admin.betaApplicationApproved')
        if (data?.welcomeEmailSent === true) {
          msg += ` ${t('admin.welcomeEmailedOk')}`
        }
        if (data?.welcomeEmailSkippedReason === 'NO_PLAIN_PASSWORD' && approveSendWelcome) {
          msg += ` ${t('admin.welcomeSkippedNoPassword')}`
        }
        setSuccess(msg)
        if (data?.welcomeEmailError) {
          setError(t('admin.welcomeEmailSmtpFailed', { detail: data.welcomeEmailError }))
        }
        const refreshed = await adminService.betaTesters()
        setBetaTesters(Array.isArray(refreshed) ? refreshed : [])
        if (data?.plainPassword && data?.email) {
          cacheBetaPasswordForEmail(data.email, data.plainPassword)
        }
      } else {
        setSuccess(t('admin.betaApplicationRejected'))
      }
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setReviewingApplicationId('')
    }
  }

  const toggleTesterSelected = (userId) => {
    const k = String(userId)
    setSelectedTesterIds((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const selectAllTesters = (on) => {
    setSelectedTesterIds(() => {
      const next = {}
      if (on) {
        betaTesters.forEach((u) => {
          next[String(u.id)] = true
        })
      }
      return next
    })
  }

  const sendCampaignBatch = async () => {
    const ids = Object.entries(selectedTesterIds)
      .filter(([, v]) => v)
      .map(([k]) => k)
    if (!ids.length || !campaignKey) return
    setCampaignSending(true)
    setError('')
    setSuccess('')
    try {
      const res = await adminService.sendBetaCampaignBatch({
        campaignKey,
        userIds: ids,
        locale: campaignLocale,
      })
      const failed = Array.isArray(res?.results)
        ? res.results.filter((r) => r.status === 'failed').length
        : 0
      if (failed > 0) {
        setSuccess(t('admin.campaignSendPartial', { sent: res.sent }))
      } else {
        setSuccess(t('admin.campaignSendSuccess', { sent: res.sent }))
      }
      const refreshed = await adminService.betaTesters()
      setBetaTesters(Array.isArray(refreshed) ? refreshed : [])
      setSelectedTesterIds({})
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setCampaignSending(false)
    }
  }

  const formatCampaignSends = (u) => {
    const m = u?.betaCampaignSends
    if (!m || typeof m !== 'object') return '—'
    const entries = Object.entries(m)
    if (!entries.length) return '—'
    return entries
      .map(([key, iso]) => {
        const d = iso ? new Date(iso) : null
        const label = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : iso
        return `${key}: ${label}`
      })
      .join(' · ')
  }

  const campaignRows =
    campaignCatalog.length > 0
      ? campaignCatalog
      : [
          { key: 'week_1', labelEs: 'Semana 1', labelEn: 'Week 1' },
          { key: 'week_2', labelEs: 'Semana 2', labelEn: 'Week 2' },
          { key: 'week_3', labelEs: 'Semana 3', labelEn: 'Week 3' },
          { key: 'week_4', labelEs: 'Semana 4', labelEn: 'Week 4' },
          { key: 'week_5', labelEs: 'Semana 5', labelEn: 'Week 5' },
          { key: 'week_6', labelEs: 'Semana 6', labelEn: 'Week 6' },
        ]

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

  const closeProvisionWelcomeModal = () => {
    setProvisionWelcomeModal(null)
    setProvisionWelcomeSending(false)
  }

  const sendProvisionWelcome = async (locale) => {
    if (!provisionWelcomeModal) return
    setProvisionWelcomeSending(true)
    setError('')
    try {
      const data = await adminService.sendBetaWelcomeEmail(provisionWelcomeModal.userId, {
        locale,
        plainPassword: provisionWelcomeModal.plainPassword,
      })
      setProvisionWelcomeSending(false)
      if (data?.welcomeEmailSent) {
        setSuccess(t('admin.provisionWelcomeSentOk'))
        closeProvisionWelcomeModal()
      } else if (data?.welcomeEmailError) {
        setError(t('admin.welcomeEmailSmtpFailed', { detail: data.welcomeEmailError }))
      } else {
        closeProvisionWelcomeModal()
      }
    } catch {
      setProvisionWelcomeSending(false)
      setError(t('admin.resolveError'))
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
      if (res.plainPassword && res.user) {
        cacheBetaPasswordForEmail(res.user.email, res.plainPassword)
        setProvisionWelcomeModal({
          userId: res.user.id,
          email: res.user.email,
          displayName: res.user.displayName || '',
          plainPassword: res.plainPassword,
        })
        setSuccess(t('admin.provisionCreatedChooseWelcome'))
      } else {
        setSuccess(t('admin.testerUpdated'))
      }
      setProv({ identifier: '', displayName: '', newPassword: '', generate: true })
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setProvisionLoading(false)
    }
  }

  return (
    <>
      <h2 className="h5 mb-3">{t('admin.titleBeta')}</h2>
      <p className="small text-muted mb-3">{t('admin.betaPageBlurb')}</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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
          <div className="border rounded p-2 mb-3 bg-body-secondary bg-opacity-10">
            <p className="small fw-semibold mb-2">{t('admin.approveWelcomeOptionsTitle')}</p>
            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="approve-send-welcome"
                checked={approveSendWelcome}
                onChange={(e) => setApproveSendWelcome(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="approve-send-welcome">
                {t('admin.approveSendWelcomeLabel')}
              </label>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <span className="small mb-0">{t('admin.welcomeEmailLanguageLabel')}</span>
              <div className="btn-group btn-group-sm" role="group" aria-label={t('admin.welcomeEmailLanguageLabel')}>
                <button
                  type="button"
                  className={`btn ${approveWelcomeLocale === 'es' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setApproveWelcomeLocale('es')}
                >
                  {t('admin.welcomeLangEs')}
                </button>
                <button
                  type="button"
                  className={`btn ${approveWelcomeLocale === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setApproveWelcomeLocale('en')}
                >
                  {t('admin.welcomeLangEn')}
                </button>
              </div>
            </div>
            <p className="small text-muted mb-0">{t('admin.approveSendWelcomeHint')}</p>
          </div>
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
          <div className="border rounded p-2 mb-3 bg-body-secondary bg-opacity-10">
            <h3 className="h6 mb-2">{t('admin.campaignEmailSectionTitle')}</h3>
            <p className="small text-muted mb-2">{t('admin.campaignEmailBlurb')}</p>
            <div className="d-flex flex-wrap gap-2 align-items-end mb-2">
              <div>
                <label className="form-label small mb-0" htmlFor="beta-campaign-key">
                  {t('admin.campaignSelectLabel')}
                </label>
                <select
                  id="beta-campaign-key"
                  className="form-select form-select-sm"
                  style={{ minWidth: 220 }}
                  value={campaignKey}
                  onChange={(e) => setCampaignKey(e.target.value)}
                >
                  {campaignRows.map((c) => (
                    <option key={c.key} value={c.key}>
                      {campaignLocale === 'en' ? c.labelEn || c.key : c.labelEs || c.key}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label small mb-0" htmlFor="beta-campaign-locale">
                  {t('admin.campaignLocaleLabel')}
                </label>
                <select
                  id="beta-campaign-locale"
                  className="form-select form-select-sm"
                  value={campaignLocale}
                  onChange={(e) => setCampaignLocale(e.target.value)}
                >
                  <option value="es">ES</option>
                  <option value="en">EN</option>
                </select>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={
                  campaignSending || !betaTesters.some((u) => selectedTesterIds[String(u.id)])
                }
                onClick={() => sendCampaignBatch()}
              >
                {campaignSending ? t('admin.campaignSendRunning') : t('admin.campaignSendButton')}
              </button>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => selectAllTesters(true)}
              >
                {t('admin.selectAllTesters')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => selectAllTesters(false)}
              >
                {t('admin.selectNoneTesters')}
              </button>
            </div>
          </div>
          <p className="small text-muted mb-2">{t('admin.addTesterBlurb')}</p>
          <div className="d-flex flex-wrap align-items-end gap-2 mb-2">
            <div>
              <label className="form-label small mb-0" htmlFor="tester-table-sort">
                {t('admin.testerListSortLabel')}
              </label>
              <select
                id="tester-table-sort"
                className="form-select form-select-sm"
                style={{ minWidth: 220 }}
                value={testerListSort}
                onChange={(e) => setTesterListSort(e.target.value)}
              >
                <option value="activity">{t('admin.testerSortActivity')}</option>
                <option value="created">{t('admin.testerSortCreated')}</option>
                <option value="email">{t('admin.testerSortEmail')}</option>
              </select>
            </div>
          </div>
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
                    <th className="text-center" title={t('admin.campaignSelectTesters')}>
                      <span className="visually-hidden">{t('admin.campaignSelectTesters')}</span>
                      ✓
                    </th>
                    <th>{t('auth.email')}</th>
                    <th>{t('admin.plan')}</th>
                    <th className="text-end">{t('admin.collectionSpidersCol')}</th>
                    <th>{t('admin.activityStatusCol')}</th>
                    <th>{t('admin.lastSeenCol')}</th>
                    <th>{t('admin.country')}</th>
                    <th>{t('admin.level')}</th>
                    <th>{t('admin.betaBugReportsTitle')}</th>
                    <th>{t('admin.sentCampaignsCol')}</th>
                    <th>{t('admin.betaEmailTemplateColName')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBetaTesters.map((u) => {
                    const tier = userActivityTier(u.lastActivityAt)
                    return (
                    <tr key={u.id}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={!!selectedTesterIds[String(u.id)]}
                          onChange={() => toggleTesterSelected(u.id)}
                          aria-label={t('admin.campaignSelectTesters')}
                        />
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge text-bg-${adminPlanBadgeClass(u)}`}>
                          {formatAdminPlanSummary(u, t)}
                        </span>
                      </td>
                      <td className="text-end font-monospace">{adminSpiderCount(u)}</td>
                      <td>
                        <span className={`badge text-bg-${activityStatusBadgeClass(tier)}`}>
                          {activityStatusLabel(tier, t)}
                        </span>
                      </td>
                      <td className="small">{formatUsageTime(u.lastActivityAt, t)}</td>
                      <td>{u.betaCountry || '-'}</td>
                      <td>{u.betaExperienceLevel || '-'}</td>
                      <td>{u.bugReportsCount ?? 0}</td>
                      <td className="small text-muted" style={{ maxWidth: 220 }}>
                        {formatCampaignSends(u)}
                      </td>
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
                    )
                  })}
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
                      <td>
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleString(i18n.language || undefined)
                          : '-'}
                      </td>
                      <td>{formatBetaBugSeverity(b.severity, t)}</td>
                      <td>{b.title || '-'}</td>
                      <td className="small text-muted">{b.currentUrl || '-'}</td>
                      <td className="d-flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => patchBugReport(b.id, 'in_progress')}
                        >
                          {t('admin.betaBugMarkInProgress')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => patchBugReport(b.id, 'fixed')}
                        >
                          {t('admin.betaBugMarkFixed')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => patchBugReport(b.id, 'wont_fix')}
                        >
                          {t('admin.betaBugMarkWontFix')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {provisionWelcomeModal ? (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content p-3">
              <h3 className="h6 mb-2">{t('admin.provisionWelcomeModalTitle')}</h3>
              <p className="small text-muted mb-3">{t('admin.provisionWelcomeModalBlurb')}</p>
              <p className="small mb-2">
                <strong>{t('auth.email')}:</strong> {provisionWelcomeModal.email}
              </p>
              <p className="small mb-3">
                <strong>{t('admin.newPasswordLabel')}:</strong>{' '}
                <code className="user-select-all">{provisionWelcomeModal.plainPassword}</code>
              </p>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={provisionWelcomeSending}
                  onClick={() => sendProvisionWelcome('es')}
                >
                  {provisionWelcomeSending ? t('common.loading') : t('admin.sendWelcomeEmailEs')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={provisionWelcomeSending}
                  onClick={() => sendProvisionWelcome('en')}
                >
                  {provisionWelcomeSending ? t('common.loading') : t('admin.sendWelcomeEmailEn')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={provisionWelcomeSending}
                  onClick={closeProvisionWelcomeModal}
                >
                  {t('admin.skipWelcomeEmail')}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                disabled={provisionWelcomeSending}
                onClick={() => {
                  navigator.clipboard.writeText(provisionWelcomeModal.plainPassword).then(
                    () => window.alert(t('admin.approvalPasswordCopied')),
                    () => window.alert(t('admin.welcomeEmailCopyFailed')),
                  )
                }}
              >
                {t('admin.approvalCopyPassword')}
              </button>
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
    </>
  )
}
