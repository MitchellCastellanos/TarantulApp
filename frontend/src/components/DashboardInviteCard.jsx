import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import referralService from '../services/referralService'
import { resolvePublicFrontOrigin } from '../utils/publicFrontBaseUrl'

export default function DashboardInviteCard({ highlight = false }) {
  const { t } = useTranslation()
  const [referral, setReferral] = useState(null)
  const [copied, setCopied] = useState('')
  const cardRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    referralService.me()
      .then((d) => { if (!cancelled) setReferral(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (highlight && referral?.code && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight, referral?.code])

  const inviteLink = useMemo(() => {
    if (!referral?.code) return ''
    return `${resolvePublicFrontOrigin()}/login?ref=${encodeURIComponent(referral.code)}`
  }, [referral?.code])

  if (!referral?.code) return null

  const invited = Number(referral.invitedCount) || 0
  const nextTh = referral.nextThreshold != null ? Number(referral.nextThreshold) : null

  const flash = (text) => {
    setCopied(text)
    setTimeout(() => setCopied(''), 2200)
  }

  const copyLink = async () => {
    const message = t('social.inviteShareMessage', {
      link: inviteLink,
      defaultValue: 'I track my tarantulas in TarantulApp. Join with my link and we both get perks: {{link}}',
    })
    try {
      await navigator.clipboard.writeText(message)
      flash(t('social.copiedInvite'))
    } catch {
      flash(inviteLink)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referral.code)
      flash(t('social.referralCopiedCode'))
    } catch {
      flash(referral.code)
    }
  }

  return (
    <div
      ref={cardRef}
      id="invite"
      className={`card border-0 shadow-sm h-100 ta-dashboard-tile${highlight ? ' ta-dashboard-tile--highlight' : ''}`}
    >
      <div className="card-body py-3">
        <h3 className="h6 fw-bold mb-1">
          <span aria-hidden="true">🎁</span> {t('social.referralHeroTitle')}
        </h3>
        <p className="small text-muted mb-2">{t('social.referralHeroSub')}</p>
        <div className="small mb-2">
          {t('social.referralInvitedShort', { count: invited, defaultValue: '{{count}} invited' })}
          {nextTh != null ? ` · ${t('social.referralStatusNext')} (${nextTh})` : ''}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-dark" onClick={copyLink}>
            {t('social.copyInviteLinkShort', 'Copy invite link')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary font-monospace"
            onClick={copyCode}
            title={t('social.referralCopyCode', 'Copy code')}
          >
            {referral.code}
          </button>
        </div>
        {copied ? <div className="small text-success mt-2">{copied}</div> : null}
      </div>
    </div>
  )
}
