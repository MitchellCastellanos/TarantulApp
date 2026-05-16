import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import { keeperProfileKeys } from '../query/keeperProfileKeys.js'
import {
  buildKeeperGamificationSnapshot,
  diffKeeperGamification,
  keeperGamificationStorageKey,
} from '../utils/keeperGamificationSnapshot'
import { keeperBadgeEmoji } from '../utils/keeperBadgeIcons'
import { keeperRankName } from '../utils/keeperRank'

const TOAST_TTL_MS = 11_000

function CelebrationToast({ item, onDismiss }) {
  useEffect(() => {
    const tmr = setTimeout(onDismiss, TOAST_TTL_MS)
    return () => clearTimeout(tmr)
  }, [onDismiss])

  const variantClass =
    item.variant === 'epic'
      ? 'ta-keeper-celebration-toast--epic'
      : item.variant === 'strong'
        ? 'ta-keeper-celebration-toast--strong'
        : 'ta-keeper-celebration-toast--default'

  return (
    <div className={`ta-keeper-celebration-toast ${variantClass}`.trim()} role="status">
      <div className="ta-keeper-celebration-toast__icon" aria-hidden="true">
        {item.emoji || '✨'}
      </div>
      <div className="ta-keeper-celebration-toast__body">
        <div className="ta-keeper-celebration-toast__title">{item.title}</div>
        {item.subtitle ? (
          <div className="ta-keeper-celebration-toast__subtitle">{item.subtitle}</div>
        ) : null}
      </div>
      <button type="button" className="ta-keeper-celebration-toast__close" onClick={onDismiss}>
        ×
      </button>
    </div>
  )
}

function mapEventsToToasts(events, profile, t) {
  const badges = Array.isArray(profile?.badges) ? profile.badges : []
  const labelForBadgeKey = (key) =>
    t(`marketplace.badges.${key}`, {
      defaultValue: badges.find((b) => b?.key === key)?.label || key,
    })

  return events.map((ev, idx) => {
    switch (ev.type) {
      case 'rep_tier_up':
        return {
          id: `rep_tier_${ev.tier}_${idx}`,
          variant: 'epic',
          emoji: '🏆',
          title: t('marketplace.celebration.repTierUpTitle'),
          subtitle: t('marketplace.celebration.repTierUpBody', {
            rank: keeperRankName(t, ev.tier),
          }),
        }
      case 'rep_milestone':
        return {
          id: `rep_ms_${ev.milestone}_${idx}`,
          variant: 'strong',
          emoji: '⭐',
          title: t('marketplace.celebration.repMilestoneTitle'),
          subtitle: t('marketplace.celebration.repMilestoneBody', {
            rank: keeperRankName(t, ev.tier),
            milestone: ev.milestone,
          }),
        }
      case 'badge_new': {
        const key = ev.badgeKey
        return {
          id: `badge_${key}_${idx}`,
          variant: 'strong',
          emoji: keeperBadgeEmoji(key),
          title: t('marketplace.celebration.newBadgeTitle'),
          subtitle: t('marketplace.celebration.newBadgeBody', { label: labelForBadgeKey(key) }),
        }
      }
      case 'track_step': {
        const tk = ev.trackKey
        const trackLabel = t(`marketplace.badgeTrack.${tk}`, { defaultValue: tk })
        return {
          id: `track_${tk}_${idx}`,
          variant: 'default',
          emoji: '📈',
          title: t('marketplace.celebration.trackStepTitle'),
          subtitle: t('marketplace.celebration.trackStepBody', { track: trackLabel }),
        }
      }
      default:
        return {
          id: `unk_${idx}`,
          variant: 'default',
          emoji: '✨',
          title: t('marketplace.celebration.genericTitle'),
          subtitle: '',
        }
    }
  })
}

/**
 * In-app toasts for new keeper badges, badge-track steps, and reputation tier / milestones.
 * Uses localStorage snapshot per user; pairs with React Query `keeperProfileKeys.detail()`.
 */
export default function KeeperGamificationCelebrationHost() {
  const { t } = useTranslation()
  const { token, user } = useAuth()
  const userId = user?.id != null ? String(user.id) : null
  const [toasts, setToasts] = useState([])

  const { data: profile } = useQuery({
    queryKey: keeperProfileKeys.detail(),
    queryFn: () => marketplaceService.getMyProfile(),
    enabled: Boolean(token && userId),
    staleTime: 45_000,
  })

  const processedSigRef = useRef('')
  const lastUserIdRef = useRef(null)

  useEffect(() => {
    if (lastUserIdRef.current === userId) return
    lastUserIdRef.current = userId
    processedSigRef.current = ''
    if (!userId) setToasts([])
  }, [userId])

  const dismiss = useCallback((id) => {
    setToasts((rows) => rows.filter((r) => r.id !== id))
  }, [])

  useEffect(() => {
    if (!userId || !profile) return

    const curr = buildKeeperGamificationSnapshot(profile)
    if (!curr) return

    const sig = JSON.stringify(curr)
    if (processedSigRef.current === sig) return

    let prevRaw = null
    try {
      prevRaw = localStorage.getItem(keeperGamificationStorageKey(userId))
    } catch {
      /* ignore */
    }
    let prev = null
    try {
      prev = prevRaw ? JSON.parse(prevRaw) : null
    } catch {
      prev = null
    }

    const { events, isBaseline } = diffKeeperGamification(prev, curr)

    if (!isBaseline && events.length > 0) {
      const items = mapEventsToToasts(events, profile, t)
      setToasts((rows) => [...rows, ...items])
    }

    try {
      localStorage.setItem(keeperGamificationStorageKey(userId), JSON.stringify(curr))
    } catch {
      /* ignore */
    }
    processedSigRef.current = sig
  }, [userId, profile, t])

  if (!token || toasts.length === 0) return null

  return (
    <div className="ta-keeper-celebration-stack" aria-live="polite">
      {toasts.map((item) => (
        <CelebrationToast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  )
}
