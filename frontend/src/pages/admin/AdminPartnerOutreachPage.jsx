import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const CHECKLIST_KEYS = [
  'wooCommerce',
  'catalogRelevant',
  'shippingFit',
  'legalSent',
  'demoSent',
  'readyToPromote',
]

const EMPTY_LEAD_FORM = {
  businessName: '',
  contactEmail: '',
  contactName: '',
  websiteUrl: '',
  country: '',
  state: '',
  city: '',
  shippingScope: '',
  note: '',
  outreachLocale: 'es',
  internalNotes: '',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function AdminPartnerOutreachPage() {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM)
  const [savingLead, setSavingLead] = useState(false)
  const [draft, setDraft] = useState(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState(null)
  const [emailTemplate, setEmailTemplate] = useState('partner_outreach_intro')
  const [emailLocale, setEmailLocale] = useState('es')
  const [attachOnePager, setAttachOnePager] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.officialVendorLeads()
      const list = Array.isArray(data) ? data : []
      setLeads(list)
      setSelectedId((prev) => (prev && !list.some((l) => l.id === prev) ? null : prev))
    } catch {
      setLeads([])
      setError(t('admin.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadLeads()
  }, [loadLeads])

  const selected = useMemo(
    () => leads.find((l) => l.id === selectedId) || null,
    [leads, selectedId],
  )

  useEffect(() => {
    if (!selected) {
      setDraft(null)
      setProbeResult(null)
      return
    }
    setDraft({
      websiteUrl: selected.websiteUrl || '',
      outreachLocale: selected.outreachLocale || 'es',
      internalNotes: selected.internalNotes || '',
      qualification: { ...(selected.qualification || {}) },
    })
    setEmailLocale(selected.outreachLocale || 'es')
    setProbeResult(null)
  }, [selected])

  const openLeads = useMemo(
    () => leads.filter((l) => l.status !== 'converted'),
    [leads],
  )

  const upsertLead = async (e) => {
    e.preventDefault()
    setSavingLead(true)
    setError('')
    setSuccess('')
    try {
      const saved = await adminService.upsertOfficialVendorOutreachLead({
        ...leadForm,
        qualification: {},
      })
      setSuccess(t('admin.partnerOutreachLeadSaved'))
      setLeadForm(EMPTY_LEAD_FORM)
      await loadLeads()
      if (saved?.id) setSelectedId(saved.id)
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || t('common.error')
      setError(t('admin.partnerOutreachSaveError', { detail }))
    } finally {
      setSavingLead(false)
    }
  }

  const saveDraft = async () => {
    if (!selected?.id || !draft) return
    setSavingDraft(true)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.patchOfficialVendorLeadOutreach(selected.id, {
        websiteUrl: draft.websiteUrl,
        outreachLocale: draft.outreachLocale,
        internalNotes: draft.internalNotes,
        qualification: draft.qualification,
      })
      setSuccess(t('admin.partnerOutreachDraftSaved'))
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || t('common.error')
      setError(t('admin.partnerOutreachSaveError', { detail }))
    } finally {
      setSavingDraft(false)
    }
  }

  const toggleCheck = (key) => {
    setDraft((d) => ({
      ...d,
      qualification: { ...d.qualification, [key]: !d.qualification?.[key] },
    }))
  }

  const runProbe = async () => {
    if (!selected?.id) return
    setProbing(true)
    setError('')
    setProbeResult(null)
    try {
      const data = await adminService.probeWooCommerceForLead(selected.id)
      setProbeResult(data?.wooProbe || data)
      if (data?.id) {
        setLeads((prev) => prev.map((l) => (l.id === data.id ? data : l)))
        setDraft({
          websiteUrl: data.websiteUrl || '',
          outreachLocale: data.outreachLocale || 'es',
          internalNotes: data.internalNotes || '',
          qualification: { ...(data.qualification || {}) },
        })
      }
      setSuccess(t('admin.partnerOutreachProbeDone'))
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || t('common.error')
      setError(t('admin.partnerOutreachProbeError', { detail }))
    } finally {
      setProbing(false)
    }
  }

  const sendEmail = async () => {
    if (!selected?.id) return
    setSendingEmail(true)
    setError('')
    setSuccess('')
    try {
      const data = await adminService.sendOfficialVendorLeadOutreachEmail(selected.id, {
        template: emailTemplate,
        locale: emailLocale,
        attachOnePager,
      })
      if (data?.sent) {
        setSuccess(t('admin.partnerOutreachEmailSent', { email: data.email }))
        await loadLeads()
      } else {
        setError(t('admin.partnerOutreachEmailFailed', { detail: data?.error || t('common.error') }))
      }
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || t('common.error')
      setError(t('admin.partnerOutreachEmailFailed', { detail }))
    } finally {
      setSendingEmail(false)
    }
  }

  const wooBadgeClass = (status) => {
    if (status === 'reachable') return 'bg-success'
    if (status === 'failed' || status === 'error') return 'bg-danger'
    return 'bg-secondary'
  }

  return (
    <div>
      <h2 className="h5 mb-2">{t('admin.titlePartnerOutreach')}</h2>
      <p className="small text-muted mb-3">{t('admin.partnerOutreachBlurb')}</p>
      <p className="small mb-3">
        <Link to="/admin/marketplace">{t('admin.partnerOutreachMarketplaceLink')}</Link>
      </p>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success py-2 small" role="alert">
          {success}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-header py-2">
              <strong className="small">{t('admin.partnerOutreachAddLead')}</strong>
            </div>
            <div className="card-body">
              <form onSubmit={upsertLead} className="small">
                <div className="mb-2">
                  <label className="form-label mb-0">{t('admin.partnerOutreachBusinessName')}</label>
                  <input
                    className="form-control form-control-sm"
                    required
                    value={leadForm.businessName}
                    onChange={(e) => setLeadForm({ ...leadForm, businessName: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label mb-0">{t('admin.partnerOutreachContactEmail')}</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    required
                    value={leadForm.contactEmail}
                    onChange={(e) => setLeadForm({ ...leadForm, contactEmail: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label mb-0">{t('admin.partnerOutreachWebsite')}</label>
                  <input
                    type="url"
                    className="form-control form-control-sm"
                    placeholder="https://"
                    value={leadForm.websiteUrl}
                    onChange={(e) => setLeadForm({ ...leadForm, websiteUrl: e.target.value })}
                  />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label mb-0">{t('admin.partnerOutreachContactName')}</label>
                    <input
                      className="form-control form-control-sm"
                      value={leadForm.contactName}
                      onChange={(e) => setLeadForm({ ...leadForm, contactName: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label mb-0">{t('admin.partnerOutreachLocale')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={leadForm.outreachLocale}
                      onChange={(e) => setLeadForm({ ...leadForm, outreachLocale: e.target.value })}
                    >
                      <option value="es">ES</option>
                      <option value="en">EN</option>
                      <option value="fr">FR</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-sm btn-primary" disabled={savingLead}>
                  {savingLead ? t('common.loading') : t('admin.partnerOutreachSaveLead')}
                </button>
              </form>
            </div>
          </div>

          <h3 className="h6">{t('admin.partnerOutreachLeadsList')}</h3>
          {loading ? (
            <p className="text-muted small">{t('common.loading')}</p>
          ) : openLeads.length === 0 ? (
            <p className="text-muted small">{t('admin.officialLeadsEmpty')}</p>
          ) : (
            <div className="list-group list-group-flush border rounded">
              {openLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={`list-group-item list-group-item-action small text-start ${
                    selectedId === lead.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedId(lead.id)}
                >
                  <div className="fw-semibold">{lead.businessName}</div>
                  <div className={selectedId === lead.id ? 'text-white-50' : 'text-muted'}>
                    {lead.contactEmail}
                  </div>
                  {lead.wooProbeStatus && (
                    <span className={`badge ${wooBadgeClass(lead.wooProbeStatus)} mt-1`}>
                      Woo: {lead.wooProbeStatus}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-lg-7">
          {!selected || !draft ? (
            <p className="text-muted small">{t('admin.partnerOutreachSelectLead')}</p>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h3 className="h6 mb-0">{selected.businessName}</h3>
                  <div className="small text-muted">
                    {selected.contactEmail}
                    {selected.lastOutreachAt && (
                      <>
                        {' · '}
                        {t('admin.partnerOutreachLastSent', {
                          date: formatDate(selected.lastOutreachAt),
                        })}
                      </>
                    )}
                  </div>
                </div>
                <span className="badge bg-light text-dark border">{selected.status}</span>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-0">{t('admin.partnerOutreachWebsite')}</label>
                <input
                  className="form-control form-control-sm"
                  value={draft.websiteUrl}
                  onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">{t('admin.partnerOutreachChecklistTitle')}</label>
                <div className="d-flex flex-column gap-1 small">
                  {CHECKLIST_KEYS.map((key) => (
                    <label key={key} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!draft.qualification?.[key]}
                        onChange={() => toggleCheck(key)}
                      />
                      <span className="form-check-label">{t(`admin.partnerOutreachCheck.${key}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-0">{t('admin.partnerOutreachInternalNotes')}</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={draft.internalNotes}
                  onChange={(e) => setDraft({ ...draft, internalNotes: e.target.value })}
                />
              </div>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={savingDraft}
                  onClick={saveDraft}
                >
                  {savingDraft ? t('common.loading') : t('admin.partnerOutreachSaveDraft')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  disabled={probing || !draft.websiteUrl?.trim()}
                  onClick={runProbe}
                >
                  {probing ? t('common.loading') : t('admin.partnerOutreachProbeWoo')}
                </button>
              </div>

              {(probeResult || selected.wooProbeStatus) && (
                <div className="alert alert-light border small py-2 mb-3">
                  <strong>{t('admin.partnerOutreachWooStatus')}:</strong>{' '}
                  {probeResult?.status || selected.wooProbeStatus || '—'}
                  <br />
                  <span className="text-muted">
                    {probeResult?.detail || selected.wooProbeDetail || ''}
                  </span>
                </div>
              )}

              <div className="card border-primary">
                <div className="card-header py-2 bg-primary bg-opacity-10">
                  <strong className="small">{t('admin.partnerOutreachSendEmail')}</strong>
                </div>
                <div className="card-body small">
                  <div className="row g-2 mb-2">
                    <div className="col-md-6">
                      <label className="form-label mb-0">{t('admin.partnerOutreachEmailTemplate')}</label>
                      <select
                        className="form-select form-select-sm"
                        value={emailTemplate}
                        onChange={(e) => setEmailTemplate(e.target.value)}
                      >
                        <option value="partner_outreach_intro">
                          {t('admin.partnerOutreachTemplateIntro')}
                        </option>
                        <option value="partner_catalog_live">
                          {t('admin.partnerOutreachTemplateCatalog')}
                        </option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label mb-0">{t('admin.partnerOutreachLocale')}</label>
                      <select
                        className="form-select form-select-sm"
                        value={emailLocale}
                        onChange={(e) => setEmailLocale(e.target.value)}
                      >
                        <option value="es">ES</option>
                        <option value="en">EN</option>
                        <option value="fr">FR</option>
                      </select>
                    </div>
                  </div>
                  <label className="form-check mb-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={attachOnePager}
                      onChange={(e) => setAttachOnePager(e.target.checked)}
                    />
                    <span className="form-check-label">{t('admin.partnerOutreachAttachOnePager')}</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={sendingEmail}
                    onClick={sendEmail}
                  >
                    {sendingEmail ? t('common.loading') : t('admin.partnerOutreachSendNow')}
                  </button>
                  {emailTemplate === 'partner_catalog_live' && selected.status !== 'converted' && (
                    <p className="text-warning small mt-2 mb-0">
                      {t('admin.partnerOutreachCatalogNeedsConverted')}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
