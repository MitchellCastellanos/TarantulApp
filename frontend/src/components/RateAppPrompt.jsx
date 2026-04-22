import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useTranslation } from 'react-i18next'
import {
  markRatePromptDisabled,
  markRatePromptRated,
  markRatePromptShown,
  registerRatePromptAppOpen,
  shouldShowRatePrompt,
} from '../utils/rateAppPrompt'

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tarantulapp.app'

function isAndroidNative() {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
}

export default function RateAppPrompt() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isAndroidNative()) return

    const state = registerRatePromptAppOpen()
    if (!shouldShowRatePrompt(state)) return

    const timer = window.setTimeout(() => {
      markRatePromptShown()
      setOpen(true)
    }, 1600)

    return () => window.clearTimeout(timer)
  }, [])

  if (!open) return null

  const handleClose = () => setOpen(false)

  const handleRateNow = () => {
    markRatePromptRated()
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleNever = () => {
    markRatePromptDisabled()
    setOpen(false)
  }

  return (
    <div
      className="modal show d-block"
      style={{ background: 'rgba(0,0,0,0.58)' }}
      onClick={handleClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('ratePrompt.title')}</h5>
            <button type="button" className="btn-close" aria-label={t('ratePrompt.close')} onClick={handleClose} />
          </div>
          <div className="modal-body">
            <p className="mb-0">{t('ratePrompt.body')}</p>
          </div>
          <div className="modal-footer d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleNever}>
              {t('ratePrompt.never')}
            </button>
            <button type="button" className="btn btn-outline-light btn-sm" onClick={handleClose}>
              {t('ratePrompt.later')}
            </button>
            <button type="button" className="btn btn-dark btn-sm" onClick={handleRateNow}>
              {t('ratePrompt.rateNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
