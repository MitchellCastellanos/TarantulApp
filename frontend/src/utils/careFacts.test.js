import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCareFactLines, deriveTempRangeC, worldBadge } from './careFacts.js'

const t = (key, opts) => {
  if (opts?.defaultValue) return opts.defaultValue
  const map = {
    'qr.facts.temperament': 'Temperament',
    'qr.facts.level': 'Level',
    'qr.facts.habitat': 'Habitat',
    'qr.facts.ventilation': 'Ventilation',
    'qr.facts.temp': 'Temp',
    'qr.facts.humidity': 'Humidity',
    'qr.facts.size': 'Size',
    'qr.facts.growth': 'Growth',
    'qr.facts.origin': 'Origin',
    'qr.facts.world.new': 'NEW WORLD',
    'qr.facts.world.old': 'OLD WORLD',
    'species.levelIntermediate': 'Intermediate',
    'habitat.arboreal': 'Arboreal',
    'species.ventModerate': 'Moderate',
    'species.growthModerate': 'Moderate',
  }
  return map[key] ?? key
}

describe('deriveTempRangeC', () => {
  it('returns old world range', () => {
    const r = deriveTempRangeC({ hobbyWorld: 'old_world', habitatType: 'terrestrial' })
    assert.equal(r.min, 25)
    assert.equal(r.max, 28)
    assert.equal(r.approx, true)
  })

  it('returns fossorial range', () => {
    const r = deriveTempRangeC({ habitatType: 'fossorial' })
    assert.equal(r.min, 24)
    assert.equal(r.max, 27)
  })
})

describe('buildCareFactLines', () => {
  it('still shows approx temp when only fallback rules apply', () => {
    const lines = buildCareFactLines({}, t, 'en')
    assert.equal(lines.length, 1)
    assert.match(lines[0], /Temp.*~24–26/)
  })

  it('includes temp and humidity when present', () => {
    const lines = buildCareFactLines(
      {
        hobbyWorld: 'new_world',
        habitatType: 'arboreal',
        humidityMin: 65,
        humidityMax: 75,
        experienceLevel: 'intermediate',
        habitatType: 'arboreal',
      },
      t,
      'en',
    )
    assert.ok(lines.some((l) => l.includes('Temp') && l.includes('~')))
    assert.ok(lines.some((l) => l.includes('65') && l.includes('75')))
  })
})

describe('worldBadge', () => {
  it('returns green badge for new world', () => {
    const b = worldBadge({ hobbyWorld: 'new_world' }, t)
    assert.equal(b.label, 'NEW WORLD')
    assert.equal(b.bg, '#2e7d32')
  })
})
