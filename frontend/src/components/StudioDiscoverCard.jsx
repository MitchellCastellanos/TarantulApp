import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import FangPanel from './FangPanel'
import meCapabilitiesService from '../services/meCapabilitiesService'
import { capabilitiesKeys } from '../hooks/useCapabilities'

export default function StudioDiscoverCard({ capabilities }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const activate = useMutation({
    mutationFn: () => meCapabilitiesService.activateStudio(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: capabilitiesKeys.all })
    },
  })

  if (!capabilities?.passportCreator) return null

  if (capabilities.studio) {
    return (
      <FangPanel className="mb-3">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <div className="fw-bold">{t('studio.discoverTitle')}</div>
            <div className="small text-muted">{t('studio.discoverSubtitle')}</div>
          </div>
          <Link to="/studio" className="btn btn-sm btn-dark">{t('studio.openStudio')}</Link>
        </div>
      </FangPanel>
    )
  }

  return (
    <FangPanel className="mb-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <div className="fw-bold">{t('studio.activateTitle')}</div>
          <div className="small text-muted">{t('studio.activateSubtitle')}</div>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-dark"
          disabled={activate.isPending}
          onClick={() => activate.mutate()}
        >
          {activate.isPending ? t('common.loading') : t('studio.activateCta')}
        </button>
      </div>
    </FangPanel>
  )
}
