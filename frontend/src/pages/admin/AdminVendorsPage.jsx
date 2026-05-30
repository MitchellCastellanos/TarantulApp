import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import LogoUploader from '../../components/LogoUploader'

const WELCOME_LOCALES = ['es', 'en', 'fr']

export default function AdminVendorsPage() {
  const { t } = useTranslation()
  const [vendors, setVendors] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [totalVendors, setTotalVendors] = useState(0)
  const [totalPendingInvites, setTotalPendingInvites] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lookupEmail, setLookupEmail] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupNotFound, setLookupNotFound] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [busyVendorId, setBusyVendorId] = useState(null)
  const [outreachBusyKey, setOutreachBusyKey] = useState(null)
  const [inviteBusyKey, setInviteBusyKey] = useState(null)

  const reloadVendors = () => {
    setVendorsLoading(true)
    adminService
      .vendorUsers(200, true)
      .then((pack) => {
        setVendors(Array.isArray(pack?.users) ? pack.users : [])
        setPendingInvites(Array.isArray(pack?.pendingInvites) ? pack.pendingInvites : [])
        setTotalVendors(typeof pack?.totalVendors === 'number' ? pack.totalVendors : 0)
        setTotalPendingInvites(typeof pack?.totalPendingInvites === 'number' ? pack.totalPendingInvites : 0)
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

  const mergeUpdatedUser = (updated) => {
    if (!updated?.id) return
    const id = String(updated.id)

    if (updated.verifiedBreeder) {
      setPendingInvites((prev) => {
        if (prev.some((row) => String(row.id) === id)) {
          setTotalPendingInvites((n) => Math.max(0, n - 1))
        }
        return prev.filter((row) => String(row.id) !== id)
      })
      setVendors((prev) => {
        const exists = prev.some((row) => String(row.id) === id)
        if (exists) return prev.map((row) => (String(row.id) === id ? updated : row))
        setTotalVendors((n) => n + 1)
        return [updated, ...prev]
      })
      return
    }

    setVendors((prev) => {
      const existed = prev.some((row) => String(row.id) === id)
      if (existed) setTotalVendors((n) => Math.max(0, n - 1))
      return prev.filter((row) => String(row.id) !== id)
    })

    if (updated.vendorInvitePending) {
      setPendingInvites((prev) => {
        const exists = prev.some((row) => String(row.id) === id)
        if (exists) return prev.map((row) => (String(row.id) === id ? updated : row))
        setTotalPendingInvites((n) => n + 1)
        return [updated, ...prev]
      })
    } else {
      setPendingInvites((prev) => {
        if (prev.some((row) => String(row.id) === id)) {
          setTotalPendingInvites((n) => Math.max(0, n - 1))
        }
        return prev.filter((row) => String(row.id) !== id)
      })
    }
  }

  const setStorefrontVerified = async (user, nextValue) => {
    setBusyVendorId(user.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.setUserStorefrontVerified(user.id, nextValue)
      setSuccess(nextValue ? t('admin.storefrontVerifiedOn') : t('admin.storefrontVerifiedOff'))
      mergeUpdatedUser(updated)
      if (lookupResult && String(lookupResult.id) === String(updated.id)) {
        setLookupResult(updated)
      }
    } catch {
      setError(t('admin.loadError'))
    } finally {
      setBusyVendorId(null)
    }
  }

  const setVendor = async (user, nextValue) => {
    setBusyVendorId(user.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.setUserVerifiedBreeder(user.id, nextValue)
      setSuccess(nextValue ? t('admin.vendorActivated') : t('admin.vendorRemoved'))
      mergeUpdatedUser(updated)
      if (lookupResult && String(lookupResult.id) === String(updated.id)) {
        setLookupResult(updated)
      }
    } catch {
      setError(t('admin.planUpdateError'))
    } finally {
      setBusyVendorId(null)
    }
  }

  const sendInvite = async (user, locale = 'es') => {
    const busy = `${String(user.id)}:${locale}`
    setInviteBusyKey(busy)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.sendVendorInvite(user.id, locale)
      setSuccess(t('admin.vendorInviteSent'))
      mergeUpdatedUser(updated)
      if (lookupResult && String(lookupResult.id) === String(updated.id)) {
        setLookupResult(updated)
      }
    } catch (err) {
      const code = err?.response?.data?.error
      setError(typeof code === 'string' ? code : t('admin.planUpdateError'))
    } finally {
      setInviteBusyKey(null)
    }
  }

  const revokeInvite = async (user) => {
    setBusyVendorId(user.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.revokeVendorInvite(user.id)
      setSuccess(t('admin.vendorInviteRevoked'))
      mergeUpdatedUser(updated)
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
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const subscriptionSummary = (u) => {
    const s = u?.stripeSubscription
    if (!s?.status) return '—'
    const cancel = s.cancelAtPeriodEnd ? ' (cancel at period end)' : ''
    return `${s.status}${cancel}`
  }

  const categorySummary = (u) => {
    const m = u?.activeListingsByCategory
    if (!m || typeof m !== 'object') return '—'
    const parts = Object.entries(m)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}:${n}`)
    return parts.length ? parts.join(' · ') : '—'
  }

  const listingsCell = (u) => {
    const tot = u?.marketplaceListingTotals
    if (!tot) return '—'
    const a = tot.active ?? 0
    const all = tot.all ?? 0
    return `${a} / ${all}`
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
                <div className="small mt-1 d-flex flex-wrap gap-1 align-items-center">
                  {lookupSummary.verifiedBreeder ? (
                    <span className="badge text-bg-success">{t('admin.vendorsStatusActive')}</span>
                  ) : lookupSummary.vendorInvitePending ? (
                    <span className="badge text-bg-warning text-dark">{t('admin.pendingBadge')}</span>
                  ) : (
                    <span className="badge text-bg-secondary">{t('admin.vendorsStatusInactive')}</span>
                  )}
                  <span className="badge text-bg-light text-dark border">
                    {t('admin.vendorsColPlan')}: {lookupSummary.plan || '—'}
                  </span>
                  {lookupSummary.storefrontVerified ? (
                    <span className="badge text-bg-success">{t('admin.storefrontVerifiedBadge')}</span>
                  ) : null}
                  <span className="badge text-bg-light text-dark border">{listingsCell(lookupSummary)} listings</span>
                </div>
                {Array.isArray(lookupSummary.opportunityHints) && lookupSummary.opportunityHints.length > 0 && (
                  <div className="small mt-1 text-muted">
                    {lookupSummary.opportunityHints.map((h) => (
                      <code key={h} className="me-1" style={{ fontSize: '0.75rem' }}>
                        {h}
                      </code>
                    ))}
                  </div>
                )}
              </div>
              <div className="d-flex flex-column gap-1" style={{ minWidth: 220 }}>
                {!lookupSummary.verifiedBreeder && (
                  <>
                    <div className="small text-muted mb-1">{t('admin.sendVendorInvite')}</div>
                    <div className="btn-group btn-group-sm w-100 mb-1" role="group">
                      {WELCOME_LOCALES.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          className="btn btn-success"
                          disabled={inviteBusyKey === `${String(lookupSummary.id)}:${loc}`}
                          onClick={() => sendInvite(lookupSummary, loc)}
                          title={`${t('admin.sendVendorInvite')} (${loc})`}
                        >
                          {inviteBusyKey === `${String(lookupSummary.id)}:${loc}` ? '…' : loc.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {lookupSummary.vendorInvitePending && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning"
                        disabled={busyVendorId === lookupSummary.id}
                        onClick={() => revokeInvite(lookupSummary)}
                      >
                        {busyVendorId === lookupSummary.id ? t('common.loading') : t('admin.revokeVendorInvite')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={busyVendorId === lookupSummary.id}
                      onClick={() => setVendor(lookupSummary, true)}
                    >
                      {busyVendorId === lookupSummary.id ? t('common.loading') : t('admin.forceActivateVendor')}
                    </button>
                  </>
                )}
                {lookupSummary.verifiedBreeder && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={busyVendorId === lookupSummary.id}
                    onClick={() => setVendor(lookupSummary, false)}
                  >
                    {busyVendorId === lookupSummary.id ? t('common.loading') : t('admin.removeVendor')}
                  </button>
                )}
                {lookupSummary.verifiedBreeder && (
                  <>
                  <button
                    type="button"
                    className={`btn btn-sm w-100 ${lookupSummary.storefrontVerified ? 'btn-outline-warning' : 'btn-success'}`}
                    disabled={busyVendorId === lookupSummary.id}
                    onClick={() => setStorefrontVerified(lookupSummary, !lookupSummary.storefrontVerified)}
                  >
                    {busyVendorId === lookupSummary.id
                      ? t('common.loading')
                      : lookupSummary.storefrontVerified
                        ? t('admin.revokeStorefrontVerified')
                        : t('admin.grantStorefrontVerified')}
                  </button>
                  <div className="btn-group btn-group-sm w-100" role="group" title={t('admin.sendVendorWelcomeHint')}>
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
                  </>
                )}
              </div>
            </div>
            <LogoUploader
              key={String(lookupSummary.id)}
              allowPreferences={false}
              service={{
                get: () => adminService.userBranding(lookupSummary.id),
                uploadLogo: (file) => adminService.uploadUserLogo(lookupSummary.id, file),
                deleteLogo: () => adminService.deleteUserLogo(lookupSummary.id),
              }}
            />
          </div>
        )}
      </div>

      <div className="card p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
          <div>
            <h3 className="h6 mb-1">{t('admin.vendorsPendingTitle')}</h3>
            <p className="small text-muted mb-0">
              {t('admin.vendorsPendingCount', { count: pendingInvites.length, total: totalPendingInvites })}
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reloadVendors} disabled={vendorsLoading}>
            {vendorsLoading ? t('common.loading') : t('admin.refresh')}
          </button>
        </div>
        {vendorsLoading ? (
          <p className="small text-muted mb-0">{t('common.loading')}</p>
        ) : pendingInvites.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.vendorsPendingEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('auth.email')}</th>
                  <th>{t('auth.name')}</th>
                  <th>{t('admin.vendorsInviteExpires')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.displayName || '—'}</td>
                    <td>{formatDate(u.vendorInviteExpiresAt)}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {WELCOME_LOCALES.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            disabled={inviteBusyKey === `${String(u.id)}:${loc}`}
                            onClick={() => sendInvite(u, loc)}
                          >
                            {inviteBusyKey === `${String(u.id)}:${loc}` ? t('common.loading') : loc.toUpperCase()}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyVendorId === u.id}
                          onClick={() => revokeInvite(u)}
                        >
                          {busyVendorId === u.id ? t('common.loading') : t('admin.revokeVendorInvite')}
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

      <div className="card p-3">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
          <div>
            <h3 className="h6 mb-1">{t('admin.vendorsActiveTitle')}</h3>
            <p className="small text-muted mb-0">
              {t('admin.vendorsActiveCount', { count: vendors.length, total: totalVendors })}
            </p>
            <p className="small text-muted mb-0 mt-1">{t('admin.vendorsViewsNote')}</p>
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
            <table className="table table-sm align-middle mb-0 small">
              <thead>
                <tr>
                  <th>{t('auth.email')}</th>
                  <th>{t('admin.vendorsHandle')}</th>
                  <th>{t('admin.vendorsColListings')}</th>
                  <th>{t('admin.vendorsColSold')}</th>
                  <th>{t('admin.vendorsColPlan')}</th>
                  <th>{t('admin.vendorsColStripe')}</th>
                  <th>{t('admin.vendorsColMix')}</th>
                  <th>{t('admin.vendorsColHints')}</th>
                  <th>{t('admin.vendorsVerifiedSince')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((u) => (
                  <tr key={u.id}>
                    <td className="text-nowrap">{u.email}</td>
                    <td>
                      {u.publicHandle ? (
                        <a href={storefrontUrl(u.publicHandle)} target="_blank" rel="noreferrer">
                          {u.publicHandle}
                        </a>
                      ) : (
                        <span className="text-muted">{t('admin.vendorsNoHandle')}</span>
                      )}
                    </td>
                    <td>{listingsCell(u)}</td>
                    <td>{u?.marketplaceListingTotals?.sold ?? '—'}</td>
                    <td>{u.plan || '—'}</td>
                    <td>{subscriptionSummary(u)}</td>
                    <td style={{ maxWidth: 140 }} className="small text-break">
                      {u.inventoryMix || '—'}
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {categorySummary(u)}
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      {Array.isArray(u.opportunityHints) &&
                        u.opportunityHints.map((h) => (
                          <code key={h} className="d-block" style={{ fontSize: '0.68rem' }}>
                            {h}
                          </code>
                        ))}
                    </td>
                    <td>{formatDate(u.verifiedBreederAt)}</td>
                    <td>
                      <div className="d-flex flex-column gap-1" style={{ minWidth: 200 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyVendorId === u.id}
                          onClick={() => setVendor(u, false)}
                        >
                          {busyVendorId === u.id ? t('common.loading') : t('admin.removeVendor')}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.storefrontVerified ? 'btn-outline-warning' : 'btn-success'}`}
                          disabled={busyVendorId === u.id}
                          onClick={() => setStorefrontVerified(u, !u.storefrontVerified)}
                        >
                          {busyVendorId === u.id
                            ? t('common.loading')
                            : u.storefrontVerified
                              ? t('admin.revokeStorefrontVerified')
                              : t('admin.grantStorefrontVerified')}
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
