import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import phoneService from '../services/phoneService'
import { useCapabilities, capabilitiesKeys } from '../hooks/useCapabilities'

/**
 * Standalone phone-ownership verification (Twilio Verify) for account settings. Phone-only — the
 * batch-issuer terms live in {@link BatchIssuerGate} at the point of issuance.
 */
export default function PhoneVerificationCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: caps } = useCapabilities()

  const verified = caps?.phoneVerified === true
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [localVerified, setLocalVerified] = useState(false)

  const isVerified = verified || localVerified
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
        await queryClient.invalidateQueries({ queryKey: capabilitiesKeys.me() })
      } else {
        setErr(t('phoneGate.errors.phone_code_invalid'))
      }
    } catch (e) {
      setErr(t(`phoneGate.errors.${errKey(e)}`, t('phoneGate.errors.phone_code_invalid')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="small text-muted mb-2">{t('account.phoneHint')}</p>
      {isVerified ? (
        <p className="mb-0">✅ {t('phoneGate.phoneVerified')}</p>
      ) : (
        <>
          <div className="input-group input-group-sm mb-2" style={{ maxWidth: 340 }}>
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
            <div className="input-group input-group-sm mb-1" style={{ maxWidth: 340 }}>
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
          {err && <p className="small text-danger mb-0">{err}</p>}
        </>
      )}
    </div>
  )
}
