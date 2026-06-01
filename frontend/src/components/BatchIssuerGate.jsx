import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import phoneService from '../services/phoneService'
import meCapabilitiesService from '../services/meCapabilitiesService'
import { capabilitiesKeys } from '../hooks/useCapabilities'

/**
 * Gate shown before batch / non-P2P label issuance: verify a phone (Twilio Verify) and accept the
 * issuer terms. Calls {@code onReady} once both are satisfied. `caps` is the capabilities payload.
 */
export default function BatchIssuerGate({ caps, onReady }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const phoneVerified = caps?.phoneVerified === true
  const termsAccepted = caps?.batchTermsAccepted === true

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [localVerified, setLocalVerified] = useState(phoneVerified)
  const [acceptChecked, setAcceptChecked] = useState(termsAccepted)

  const isVerified = phoneVerified || localVerified

  const refreshCaps = async () => {
    await queryClient.invalidateQueries({ queryKey: capabilitiesKeys.me() })
  }

  const errKey = (e) => e?.response?.data?.message || e?.response?.data?.error || ''

  const sendCode = async () => {
    setErr(''); setBusy(true)
    try {
      await phoneService.start(phone.trim())
      setSent(true)
    } catch (e) {
      setErr(t(`phoneGate.errors.${errKey(e)}`, t('phoneGate.errors.generic')))
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setErr(''); setBusy(true)
    try {
      const res = await phoneService.check(code.trim())
      if (res?.verified) {
        setLocalVerified(true)
        await refreshCaps()
      } else {
        setErr(t('phoneGate.errors.phone_code_invalid'))
      }
    } catch (e) {
      setErr(t(`phoneGate.errors.${errKey(e)}`, t('phoneGate.errors.phone_code_invalid')))
    } finally {
      setBusy(false)
    }
  }

  const acceptTerms = async () => {
    setErr(''); setBusy(true)
    try {
      const updated = await meCapabilitiesService.acceptBatchTerms()
      await refreshCaps()
      if (updated?.phoneVerified && updated?.batchTermsAccepted) onReady?.()
    } catch (e) {
      setErr(t(`phoneGate.errors.${errKey(e)}`, t('phoneGate.errors.generic')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="alert alert-warning">
      <p className="fw-semibold mb-1">{t('phoneGate.title')}</p>
      <p className="small mb-3">{t('phoneGate.intro')}</p>

      {/* Step 1: phone verification */}
      <div className="mb-3">
        <p className="small fw-semibold mb-1">
          {isVerified ? `✅ ${t('phoneGate.phoneVerified')}` : t('phoneGate.phoneStep')}
        </p>
        {!isVerified && (
          <>
            <div className="input-group input-group-sm mb-2" style={{ maxWidth: 320 }}>
              <input
                type="tel"
                className="form-control"
                placeholder="+1 415 555 2671"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
              />
              <button type="button" className="btn btn-outline-dark" onClick={sendCode} disabled={busy || !phone.trim()}>
                {sent ? t('phoneGate.resend') : t('phoneGate.sendCode')}
              </button>
            </div>
            {sent && (
              <div className="input-group input-group-sm mb-1" style={{ maxWidth: 320 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  placeholder={t('phoneGate.codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={busy}
                />
                <button type="button" className="btn btn-dark" onClick={verifyCode} disabled={busy || !code.trim()}>
                  {t('phoneGate.verify')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 2: terms acceptance */}
      <div className="mb-2">
        <p className="small fw-semibold mb-1">
          {termsAccepted ? `✅ ${t('phoneGate.termsAccepted')}` : t('phoneGate.termsStep')}
        </p>
        {!termsAccepted && (
          <div className="form-check small mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="batchTermsAccept"
              checked={acceptChecked}
              onChange={(e) => setAcceptChecked(e.target.checked)}
              disabled={busy}
            />
            <label className="form-check-label" htmlFor="batchTermsAccept">
              {t('phoneGate.termsLabel')}
            </label>
          </div>
        )}
        {!termsAccepted && (
          <button
            type="button"
            className="btn btn-dark btn-sm"
            onClick={acceptTerms}
            disabled={busy || !isVerified || !acceptChecked}
          >
            {t('phoneGate.confirm')}
          </button>
        )}
      </div>

      {err && <p className="small text-danger mb-0">{err}</p>}
    </div>
  )
}
