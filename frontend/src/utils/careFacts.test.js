import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCareFactLines, deriveTempRangeC } from './careFacts.js'

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
    'qr.facts.substrate': 'Substrate',
    'qr.facts.worldShort.new': 'NW',
    'qr.facts.worldShort.old': 'OW',
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

  it('includes hobby world inline with habitat', () => {
    const lines = buildCareFactLines(
      {
        hobbyWorld: 'new_world',
        habitatType: 'arboreal',
        humidityMin: 65,
        humidityMax: 75,
      },
      t,
      'en',
    )
    const habitatLine = lines.find((l) => l.includes('Habitat'))
    assert.ok(habitatLine)
    assert.match(habitatLine, /NW/)
    assert.match(habitatLine, /Arboreal/)
  })

  it('includes substrate when present', () => {
    const lines = buildCareFactLines(
      {
        narrativeI18n: { substrate: { en: 'Dry coco, coarse sand' } },
        originRegion: 'Venezuela',
      },
      t,
      'en',
    )
    assert.ok(lines.some((l) => l.startsWith('Substrate:') && l.includes('coco')))
  })

  it('includes temp and humidity when present', () => {
    const lines = buildCareFactLines(
      {
        hobbyWorld: 'new_world',
        habitatType: 'arboreal',
        humidityMin: 65,
        humidityMax: 75,
        experienceLevel: 'intermediate',
      },
      t,
      'en',
    )
    assert.ok(lines.some((l) => l.includes('Temp') && l.includes('~')))
    assert.ok(lines.some((l) => l.includes('65') && l.includes('75')))
  })
})
