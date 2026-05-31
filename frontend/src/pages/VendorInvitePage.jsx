import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import publicApi from '../services/publicApi'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { capabilitiesKeys } from '../hooks/useCapabilities'
import { keeperProfileKeys } from '../query/keeperProfileKeys'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'

export default function VendorInvitePage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token } = useAuth()
  const inviteToken = searchParams.get('token') || ''

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!inviteToken) {
      setLoading(false)
      setStatus({ ok: false, status: 'not_found' })
      return undefined
    }
    publicApi
      .get('/auth/vendor-invite/status', { params: { token: inviteToken } })
      .then(({ data }) => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setStatus({ ok: false, status: 'not_found' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [inviteToken])

  useEffect(() => {
    if (!inviteToken || token) return
    try {
      sessionStorage.setItem(
        'ta_post_login_redirect',
        `/vendor-invite?token=${encodeURIComponent(inviteToken)}`,
      )
    } catch (_) {
      /* ignore */
    }
  }, [inviteToken, token])

  const accept = async () => {
    setAccepting(true)
    setError('')
    try {
      const { data } = await api.post('/auth/vendor-invite/accept', { token: inviteToken })
      const next = typeof data?.nextPath === 'string' && data.nextPath.startsWith('/') ? data.nextPath : '/marketplace/sell'
      queryClient.invalidateQueries({ queryKey: capabilitiesKeys.all })
      queryClient.invalidateQueries({ queryKey: keeperProfileKeys.all })
      navigate(next, { replace: true })
    } catch (err) {
      const code = err?.response?.data?.error
      if (code === 'INVITE_WRONG_ACCOUNT') {
        setError(t('auth.vendorInviteWrongAccount'))
      } else if (typeof code === 'string' && code.length > 0) {
        setError(code)
      } else {
        setError(t('common.error'))
      }
    } finally {
      setAccepting(false)
    }
  }

  const valid = status?.ok === true && status?.status === 'valid'
  const already = status?.status === 'already_accepted'
  const showLogin = !token && valid
  const canAccept = token && valid

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar variant="public" hideLoginLink />
      <div className="flex-grow-1 d-flex align-items-center justify-content-center px-3 py-3">
        <ChitinCardFrame className="w-100" style={{ maxWidth: 440 }} showSilhouettes={false} variant="auth">
          <div className="card border-0 bg-transparent shadow-none w-100">
            <div className="card-body p-3 p-md-4">
              <div className="text-center mb-3">
                <div className="fs-1 mb-2">🏪</div>
                <h2 className="fw-bold mb-1">{t('auth.vendorInviteTitle')}</h2>
                <p className="text-muted small mb-0">{t('auth.vendorInviteSubtitle')}</p>
              </div>

              {loading ? (
                <p className="small text-center text-muted mb-0">{t('common.loading')}</p>
              ) : !inviteToken || status?.status === 'not_found' ? (
                <div className="alert alert-warning small mb-0">{t('auth.vendorInviteInvalid')}</div>
              ) : status?.status === 'expired' ? (
                <div className="alert alert-warning small mb-0">{t('auth.vendorInviteInvalid')}</div>
              ) : already ? (
                <>
                  <div className="alert alert-info small">{t('auth.vendorInviteAlready')}</div>
                  <button type="button" className="btn btn-dark w-100" onClick={() => navigate('/marketplace/sell', { replace: true })}>
                    {t('auth.vendorInviteGoSell')}
                  </button>
                </>
              ) : (
                <>
                  {status?.emailHint ? (
                    <p className="small mb-2">
                      <span className="text-muted">{t('auth.vendorInviteEmailHint')}</span>{' '}
                      <span className="fw-semibold">{status.emailHint}</span>
                    </p>
                  ) : null}
                  {error ? <div className="alert alert-danger py-2 small mb-3">{error}</div> : null}
                  {showLogin ? (
                    <Link
                      to="/login"
                      state={{
                        redirectAfterAuth: `/vendor-invite?token=${encodeURIComponent(inviteToken)}`,
                      }}
                      className="btn btn-dark w-100"
                    >
                      {t('auth.vendorInviteLoginCta')}
                    </Link>
                  ) : null}
                  {canAccept ? (
                    <button type="button" className="btn btn-success w-100" disabled={accepting} onClick={accept}>
                      {accepting ? t('common.loading') : t('auth.vendorInviteAccept')}
                    </button>
                  ) : null}
                  {!valid && !already ? (
                    <div className="alert alert-warning small mt-3 mb-0">{t('auth.vendorInviteInvalid')}</div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </ChitinCardFrame>
      </div>
    </div>
  )
}
