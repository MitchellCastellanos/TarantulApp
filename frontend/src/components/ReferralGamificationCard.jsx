/**
 * Invitaciones / referidos: código, hitos desde API y barra de progreso simple.
 */
export default function ReferralGamificationCard({ referral, inviteLink, onCopyInviteMessage, onCopyCode, t }) {
  const milestones = Array.isArray(referral?.milestones) ? referral.milestones : []
  const invited = Number(referral?.invitedCount) || 0
  const nextTh = referral?.nextThreshold != null ? Number(referral.nextThreshold) : null
  const maxTh = milestones.length ? milestones[milestones.length - 1].threshold : 25

  const tierStatus = (m) => {
    if (m.claimed || m.reached) return 'claimed'
    if (nextTh != null && m.threshold === nextTh) return 'next'
    return 'locked'
  }

  const tierLabel = (m) => {
    const days = Number(m.extraDays) || 0
    if (days > 0) {
      return t('social.referralTierDays', { count: m.threshold, days })
    }
    return t('social.referralTierBadge', { count: m.threshold })
  }

  const statusLabel = (st) => {
    if (st === 'claimed') return t('social.referralStatusClaimed')
    if (st === 'next') return t('social.referralStatusNext')
    return t('social.referralStatusLocked')
  }

  return (
    <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
      <div className="card-body py-3 px-3 px-md-4">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="h5 fw-bold mb-1 cinzel" style={{ color: 'var(--ta-parchment)' }}>
              {t('social.referralHeroTitle')}
            </h2>
            <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>
              {t('social.referralHeroSub')}
            </p>
          </div>
          <div
            className="flex-shrink-0 rounded-3 d-flex align-items-center justify-content-center px-3 py-2"
            style={{
              fontSize: '2rem',
              background: 'radial-gradient(circle at 30% 20%, rgba(160,32,240,0.35), rgba(0,0,0,0.2))',
              border: '1px solid rgba(160,32,240,0.35)',
            }}
            aria-hidden
          >
            🎁
          </div>
        </div>

        <div
          className="rounded-3 p-3 mb-3"
          style={{ border: '1px dashed rgba(160, 32, 240, 0.55)', background: 'rgba(0,0,0,0.2)' }}
        >
          <div className="small fw-semibold mb-1" style={{ color: 'var(--ta-purple)' }}>
            {t('social.referralYourCodeLabel')}
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <code className="user-select-all fs-5 mb-0" style={{ color: 'var(--ta-parchment)' }}>
              {referral.code}
            </code>
            <button type="button" className="btn btn-sm btn-outline-light" onClick={onCopyCode} title={t('social.referralCopyCode')}>
              {t('social.referralCopyCode')}
            </button>
          </div>
        </div>

        <div className="mb-2">
          <div className="text-uppercase small fw-semibold mb-2" style={{ color: 'var(--ta-purple)', letterSpacing: '0.06em' }}>
            {t('social.referralMilestoneProgress')}
          </div>
          <div className="d-flex align-items-center gap-1 mb-1">
            <span className="display-6 fw-bold mb-0" style={{ color: 'var(--ta-parchment)', lineHeight: 1 }}>
              {invited}
            </span>
            <span className="small text-muted align-self-end pb-1">{t('social.referralFriendsInvited')}</span>
          </div>
          <p className="small text-muted mb-3">{t('social.referralProgressHint')}</p>

          <div className="d-flex align-items-center position-relative px-1" style={{ minHeight: 40 }}>
            <div
              className="position-absolute start-0 end-0"
              style={{
                height: 3,
                top: '50%',
                transform: 'translateY(-50%)',
                marginLeft: '6%',
                marginRight: '6%',
                background: 'linear-gradient(90deg, var(--ta-purple) 0%, var(--ta-purple) ' +
                  `${Math.min(100, milestones.length ? (invited / maxTh) * 100 : 0)}%, ` +
                  'rgba(255,255,255,0.12) ' +
                  `${Math.min(100, milestones.length ? (invited / maxTh) * 100 : 0)}%, rgba(255,255,255,0.12) 100%)`,
                borderRadius: 999,
              }}
              aria-hidden
            />
            <div className="d-flex justify-content-between w-100 position-relative" style={{ zIndex: 1 }}>
              {milestones.map((m) => {
                const reached = invited >= m.threshold
                const isNextNode = nextTh != null && m.threshold === nextTh && !reached
                const bg = m.claimed || reached ? 'var(--ta-purple)' : 'rgba(255,255,255,0.2)'
                const ring = isNextNode ? '0 0 0 3px rgba(212,175,55,0.55)' : 'none'
                return (
                  <div key={m.threshold} className="d-flex flex-column align-items-center" style={{ width: `${100 / milestones.length}%` }}>
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold small text-white"
                      style={{
                        width: 28,
                        height: 28,
                        background: bg,
                        boxShadow: ring,
                        fontSize: '0.65rem',
                      }}
                      title={String(m.threshold)}
                    >
                      {m.claimed || reached ? '✓' : m.threshold}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <p className="small mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.55 }}>
          {t('social.inviteBonusLine', { referee: referral.refereeBonusDays, referrer: referral.referrerBonusDays })}
        </p>
        <p className="small text-muted mb-3">{t('social.referralLadderIntroShort')}</p>

        <div className="d-flex flex-column gap-2 mb-3">
          {milestones.map((m) => {
            const st = tierStatus(m)
            const border =
              st === 'next' ? '1px solid rgba(160, 32, 240, 0.85)' : '1px solid var(--ta-border, rgba(255,255,255,0.12))'
            return (
              <div
                key={m.threshold}
                className="rounded-3 p-2 d-flex align-items-center justify-content-between gap-2 flex-wrap"
                style={{ background: 'rgba(0,0,0,0.2)', border }}
              >
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <span
                    className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 text-white small fw-bold"
                    style={{
                      width: 30,
                      height: 30,
                      background: st === 'locked' ? 'rgba(255,255,255,0.15)' : 'var(--ta-purple)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {st === 'claimed' ? '✓' : m.threshold}
                  </span>
                  <span className="small fw-semibold text-break" style={{ color: 'var(--ta-parchment)' }}>
                    {tierLabel(m)}
                  </span>
                </div>
                <span
                  className="small flex-shrink-0 fw-semibold"
                  style={{
                    color: st === 'claimed' ? 'var(--ta-purple)' : st === 'next' ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                  }}
                >
                  {statusLabel(st)}
                  {st === 'locked' && <span className="ms-1">🔒</span>}
                </span>
              </div>
            )
          })}
        </div>

        {referral.founderKeeper && (
          <p className="mb-3">
            <span className="badge bg-warning text-dark">{t('social.founderKeeperBadge')}</span>
          </p>
        )}

        <div className="d-flex flex-wrap gap-2 mb-2">
          <button type="button" className="btn btn-sm fw-semibold" style={{ background: 'var(--ta-purple)', color: '#fff' }} onClick={onCopyInviteMessage}>
            {t('social.referralShareCta')}
          </button>
        </div>
        <p className="mt-2 mb-0 text-muted small" style={{ wordBreak: 'break-all' }}>
          {inviteLink}
        </p>
      </div>
    </div>
  )
}
