import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const WELCOME_LOCALES = ['es', 'en', 'fr']

export default function AdminVendorsPage() {
  const { t } = useTranslation()
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [totalVendors, setTotalVendors] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupNotFound, setLookupNotFound] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [busyVendorId, setBusyVendorId] = useState(null)
  const [outreachBusyKey, setOutreachBusyKey] = useState(null)

  const reloadVendors = () => {
    setVendorsLoading(true)
    adminService
      .vendorUsers(200)
      .then((pack) => {
        setVendors(Array.isArray(pack?.users) ? pack.users : [])
        setTotalVendors(typeof pack?.totalVendors === 'number' ? pack.totalVendors : 0)
      })
      .catch((err) => {
        const code = err?.response?.status
        setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
      })
      .finally(() => setVendorsLoading(false))
  }

  useEffect(() => {
    reloadVendors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lookupUser = async (e) => {
    e?.preventDefault?.()
    const email = lookupEmail.trim()
    if (!email) return
    setLookupLoading(true)
    setLookupResult(null)
    setLookupNotFound(false)
    setError('')
    try {
      const data = await adminService.userLookupByEmail(email)
      if (data?.found) {
        setLookupResult(data.user)
      } else {
        setLookupNotFound(true)
      }
    } catch (err) {
      const code = err?.response?.status
      setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
    } finally {
      setLookupLoading(false)
    }
  }

  const setVendor = async (user, nextValue) => {
    setBusyVendorId(user.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.setUserVerifiedBreeder(user.id, nextValue)
      setSuccess(nextValue ? t('admin.vendorActivated') : t('admin.vendorRemoved'))
      if (nextValue) {
        setVendors((prev) => {
          const exists = prev.some((row) => String(row.id) === String(updated.id))
          if (exists) {
            return prev.map((row) => (String(row.id) === String(updated.id) ? updated : row))
          }
          setTotalVendors((n) => n + 1)
          return [updated, ...prev]
        })
      } else {
        setVendors((prev) => {
          const existed = prev.some((row) => String(row.id) === String(updated.id))
          if (existed) {
            setTotalVendors((n) => Math.max(0, n - 1))
          }
          return prev.filter((row) => String(row.id) !== String(updated.id))
        })
      }
      if (lookupResult && String(lookupResult.id) === String(updated.id)) {
        setLookupResult(updated)
      }
    } catch {
      setError(t('admin.planUpdateError'))
    } finally {
      setBusyVendorId(null)
    }
  }

  const sendVendorWelcome = async (user, locale) => {
    const busy = `${String(user.id)}:${locale}`
    setOutreachBusyKey(busy)
    setError('')
    setSuccess('')
    try {
      const data = await adminService.sendOutreachEmail(user.id, {
        templateKey: 'vendor_welcome_mx',
        locale,
      })
      if (data?.sent === true) {
        setSuccess(t('admin.outreachEmailSent'))
      } else {
        setError(t('admin.outreachEmailFailed', { detail: data?.error || t('common.error') }))
      }
    } catch (err) {
      const detail = err?.response?.data?.message || err?.message || t('common.error')
      setError(t('admin.outreachEmailFailed', { detail }))
    } finally {
      setOutreachBusyKey(null)
    }
  }

  const storefrontUrl = (handle) => {
    if (!handle) return ''
    return `/shop/${encodeURIComponent(handle)}`
  }

  const formatDate = (iso) => {
    if (!iso) return '-'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const lookupSummary = useMemo(() => {
    if (!lookupResult) return null
    return {
      ...lookupResult,
      handle: lookupResult.publicHandle || '',
    }
  }, [lookupResult])

  return (
    <>
      <h2 className="h5 mb-3">{t('admin.titleVendors')}</h2>
      <p className="small text-muted mb-3">{t('admin.vendorsBlurb')}</p>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card p-3 mb-3 border-warning">
        <h3 className="h6 mb-2">{t('admin.vendorTermsTitle')}</h3>
        <ul className="small mb-0" style={{ lineHeight: 1.55 }}>
          <li>{t('admin.vendorTermsLi1')}</li>
          <li>{t('admin.vendorTermsLi2')}</li>
          <li>{t('admin.vendorTermsLi3')}</li>
          <li>{t('admin.vendorTermsLi4')}</li>
          <li>{t('admin.vendorTermsLi5')}</li>
          <li>{t('admin.vendorTermsLi6')}</li>
        </ul>
      </div>

      <div className="card p-3 mb-3">
        <h3 className="h6 mb-2">{t('admin.vendorsLookupTitle')}</h3>
        <p className="small text-muted mb-2">{t('admin.vendorsLookupHint')}</p>
        <form className="d-flex flex-wrap gap-2 align-items-end mb-2" onSubmit={lookupUser}>
          <div className="flex-grow-1" style={{ minWidth: 240 }}>
            <label className="form-label small mb-0" htmlFor="vendor-lookup-email">
              {t('admin.vendorsLookupEmail')}
            </label>
            <input
              id="vendor-lookup-email"
              type="email"
              className="form-control form-control-sm"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="tienda@example.com"
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn btn-sm btn-primary" disabled={lookupLoading || !lookupEmail.trim()}>
            {lookupLoading ? t('common.loading') : t('admin.vendorsLookupBtn')}
          </button>
        </form>
        {lookupNotFound && <p className="small text-muted mb-0">{t('admin.vendorsLookupEmpty')}</p>}
        {lookupSummary && (
          <div className="border rounded p-2 mt-2" style={{ borderColor: 'var(--ta-border)' }}>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <div className="fw-semibold">{lookupSummary.email}</div>
                <div className="small text-muted">
                  {lookupSummary.displayName || '—'} ·{' '}
                  {lookupSummary.handle ? (
                    <a href={storefrontUrl(lookupSummary.handle)} target="_blank" rel="noreferrer">
                      /shop/{lookupSummary.handle}
                    </a>
                  ) : (
                    <span>{t('admin.vendorsNoHandle')}</span>
                  )}
                </div>
                <div className="small">
                  {lookupSummary.verifiedBreeder ? (
                    <span className="badge text-bg-success">{t('admin.vendorsStatusActive')}</span>
                  ) : (
                    <span className="badge text-bg-secondary">{t('admin.vendorsStatusInactive')}</span>
                  )}
                </div>
              </div>
              <div className="d-flex flex-column gap-1">
                <button
                  type="button"
                  className={`btn btn-sm ${lookupSummary.verifiedBreeder ? 'btn-outline-danger' : 'btn-success'}`}
                  disabled={busyVendorId === lookupSummary.id}
                  onClick={() => setVendor(lookupSummary, !lookupSummary.verifiedBreeder)}
                >
                  {busyVendorId === lookupSummary.id
                    ? t('common.loading')
                    : lookupSummary.verifiedBreeder
                      ? t('admin.removeVendor')
                      : t('admin.makeVendor')}
                </button>
                {lookupSummary.verifiedBreeder && (
                  <div className="btn-group btn-group-sm" role="group" title={t('admin.sendVendorWelcomeHint')}>
                    {WELCOME_LOCALES.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={outreachBusyKey === `${String(lookupSummary.id)}:${loc}`}
                        onClick={() => sendVendorWelcome(lookupSummary, loc)}
                      >
                        {outreachBusyKey === `${String(lookupSummary.id)}:${loc}`
                          ? t('common.loading')
                          : loc.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-3">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
          <div>
            <h3 className="h6 mb-1">{t('admin.vendorsActiveTitle')}</h3>
            <p className="small text-muted mb-0">
              {t('admin.vendorsActiveCount', { count: vendors.length, total: totalVendors })}
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reloadVendors} disabled={vendorsLoading}>
            {vendorsLoading ? t('common.loading') : t('admin.refresh')}
          </button>
        </div>

        {vendorsLoading ? (
          <p className="small text-muted mb-0">{t('common.loading')}</p>
        ) : vendors.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.vendorsActiveEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('auth.email')}</th>
                  <th>{t('auth.name')}</th>
                  <th>{t('admin.vendorsHandle')}</th>
                  <th>{t('admin.vendorsVerifiedSince')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.displayName || '—'}</td>
                    <td>
                      {u.publicHandle ? (
                        <a href={storefrontUrl(u.publicHandle)} target="_blank" rel="noreferrer">
                          /shop/{u.publicHandle}
                        </a>
                      ) : (
                        <span className="small text-muted">{t('admin.vendorsNoHandle')}</span>
                      )}
                    </td>
                    <td>{formatDate(u.verifiedBreederAt)}</td>
                    <td>
                      <div className="d-flex flex-column gap-1" style={{ minWidth: 220 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyVendorId === u.id}
                          onClick={() => setVendor(u, false)}
                        >
                          {busyVendorId === u.id ? t('common.loading') : t('admin.removeVendor')}
                        </button>
                        <div className="small text-muted">{t('admin.sendVendorWelcomeLabel')}</div>
                        <div className="btn-group btn-group-sm w-100" role="group" title={t('admin.sendVendorWelcomeHint')}>
                          {WELCOME_LOCALES.map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              className="btn btn-outline-primary"
                              disabled={outreachBusyKey === `${String(u.id)}:${loc}`}
                              onClick={() => sendVendorWelcome(u, loc)}
                            >
                              {outreachBusyKey === `${String(u.id)}:${loc}` ? t('common.loading') : loc.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
