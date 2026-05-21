import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { useUnitSystem } from '../hooks/useUnitSystem'
import { cmToDisplayNumber } from '../utils/units'

/**
 * @param {{ molts: Array<{ moltedAt?: string, preSizeCm?: unknown, postSizeCm?: unknown }>, species?: { adultSizeCmMin?: unknown, adultSizeCmMax?: unknown } }} props
 */
export default function MoltGrowthChart({ molts, species }) {
  const { t } = useTranslation()
  const { system, unit } = useUnitSystem()

  const data = [...(molts || [])]
    .reverse()
    .map((m, i) => ({
      label: `#${i + 1}`,
      date: m.moltedAt,
      pre: m.preSizeCm != null ? cmToDisplayNumber(m.preSizeCm, system) : undefined,
      post: m.postSizeCm != null ? cmToDisplayNumber(m.postSizeCm, system) : undefined,
    }))
    .filter((d) => d.pre != null || d.post != null)

  if (data.length === 0) return null

  const adultMin = species?.adultSizeCmMin != null ? cmToDisplayNumber(species.adultSizeCmMin, system) : null
  const adultMax = species?.adultSizeCmMax != null ? cmToDisplayNumber(species.adultSizeCmMax, system) : null

  return (
    <div
      className="rounded-3 border p-3 ta-premium-pane mb-0"
      style={{ borderColor: 'var(--ta-border, rgba(255,255,255,0.12))' }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ta-text-muted)' }} />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--ta-text-muted)' }}
            unit={` ${unit}`}
            domain={['auto', adultMax != null && !Number.isNaN(adultMax) ? adultMax + 1 : 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1528',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--ta-parchment)' }}
            formatter={(val, name) => [`${val} ${unit}`, t(`molt.${name}`)]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--ta-text-muted)' }}
            formatter={(value) => t(`molt.${value}`)}
          />
          <Line type="monotone" dataKey="pre" stroke="#c09040" strokeWidth={1.5} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="post" stroke="#9060e0" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          {adultMin != null && !Number.isNaN(adultMin) && (
            <ReferenceLine
              y={adultMin}
              stroke="rgba(144,96,224,0.4)"
              strokeDasharray="4 3"
              label={{
                value: t('molt.adultMin'),
                fill: 'rgba(144,96,224,0.7)',
                fontSize: 10,
                position: 'right',
              }}
            />
          )}
          {adultMax != null && !Number.isNaN(adultMax) && (
            <ReferenceLine
              y={adultMax}
              stroke="rgba(144,96,224,0.7)"
              strokeDasharray="4 3"
              label={{
                value: t('molt.adultMax'),
                fill: 'rgba(144,96,224,0.9)',
                fontSize: 10,
                position: 'right',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {adultMax != null && !Number.isNaN(adultMax) && (
        <p className="mb-0 mt-2" style={{ fontSize: '0.7rem', color: 'var(--ta-text-muted)' }}>
          {t('molt.growthCurveNote')}
        </p>
      )}
    </div>
  )
}
