#!/usr/bin/env node
/**
 * Export Monarch Reptiles price list (tarantulas, enclosures/terrariums, substrates)
 * from the public WooCommerce Store API. Same category rules as backend sync.
 *
 * Usage:
 *   node scripts/export-monarch-pricelist.mjs
 *   node scripts/export-monarch-pricelist.mjs --out scripts/output
 */

import fs from 'fs'
import path from 'path'

const BASE = process.env.MONARCH_BASE_URL || 'https://monarchreptiles.com'
const PAGE_SIZE = 100
const MAX_PAGES = 80
const EXPORT_CATEGORIES = new Set(['tarantulas', 'terrariums', 'substrates'])

const NON_TARANTULA_SLUGS = new Set([
  'jumping-spiders', 'jumping-spider', 'millipedes', 'millipede', 'scorpions', 'scorpion',
  'ants', 'ant', 'other-invertebrates', 'centipedes', 'snails', 'beetles',
])

const NON_TARANTULA_TITLE = [
  'millipede', 'jumping spider', 'jumping-spider', ' scorpion', 'scorpions',
  'centipede', 'mantis', 'gecko', 'lizard', 'snake', 'phidippus', 'narceus americanus',
]

function stripHtml(s) {
  if (!s) return ''
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeHtml(s) {
  if (!s) return ''
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
}

function looksLikeNonTarantulaSpecimen(title, description) {
  const blob = `${title || ''} ${description || ''}`.toLowerCase()
  return NON_TARANTULA_TITLE.some((n) => blob.includes(n))
}

function collectSlugs(categories) {
  if (!Array.isArray(categories)) return new Set()
  return new Set(
    categories.map((c) => (c.slug || '').toLowerCase()).filter(Boolean),
  )
}

function hasNonTarantulaAnimalCategory(slugs) {
  for (const slug of slugs) {
    if (NON_TARANTULA_SLUGS.has(slug)) return true
    if (slug.includes('millipede') || slug.includes('jumping-spider') || slug.includes('scorpion')) {
      return true
    }
  }
  return false
}

function resolveCategory(slugs, brandSlugs) {
  if (brandSlugs.has('tarantula-cribs') || [...slugs].some((s) => s.includes('tarantula-crib'))) {
    return 'terrariums'
  }
  const has = (...candidates) => candidates.some((c) => slugs.has(c))
  if (has('tarantulas', 'new-world', 'old-world', 'old-world-tarantulas') || [...slugs].some((s) => s.includes('tarantula'))) {
    return 'tarantulas'
  }
  if (has('substrate', 'substrates', 'bioactive', 'moss-plants-leaf-litter', 'springtails-isopods-worms')) {
    return 'substrates'
  }
  if (has('terrariums', 'terrariums-and-enclosures', 'enclosures', 'starter-terrarium-kits', 'pvc-cages', 'exo-terra')) {
    return 'terrariums'
  }
  return null
}

function parsePrice(prices) {
  if (!prices?.price) return { amount: null, currency: prices?.currency_code || 'CAD' }
  const raw = Number(prices.price)
  if (Number.isNaN(raw)) return { amount: null, currency: prices?.currency_code || 'CAD' }
  return { amount: (raw / 100).toFixed(2), currency: prices.currency_code || 'CAD' }
}

function mapProduct(product) {
  const title = decodeHtml(product.name || '')
  const description = stripHtml(product.short_description || '')
  if (looksLikeNonTarantulaSpecimen(title, description)) return null

  const slugs = collectSlugs(product.categories)
  const brandSlugs = collectSlugs(product.brands)
  if (hasNonTarantulaAnimalCategory(slugs)) return null

  const listingCategory = resolveCategory(slugs, brandSlugs)
  if (!listingCategory || !EXPORT_CATEGORIES.has(listingCategory)) return null

  const { amount, currency } = parsePrice(product.prices)
  const categoryLabel =
    listingCategory === 'terrariums' ? 'enclosures' : listingCategory

  return {
    externalId: String(product.id),
    sku: product.sku || '',
    title,
    listingCategory,
    categoryLabel,
    priceAmount: amount,
    currency,
    inStock: product.is_in_stock !== false,
    permalink: product.permalink || '',
    wcCategorySlugs: [...slugs].join('|'),
  }
}

async function fetchPage(page) {
  const url = `${BASE}/wp-json/wc/store/v1/products?per_page=${PAGE_SIZE}&page=${page}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`WooCommerce fetch failed page ${page}: ${res.status}`)
  return res.json()
}

async function fetchAll() {
  const rows = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchPage(page)
    if (!Array.isArray(batch) || batch.length === 0) break
    for (const product of batch) {
      const row = mapProduct(product)
      if (row) rows.push(row)
    }
    if (batch.length < PAGE_SIZE) break
  }
  rows.sort((a, b) => {
    const c = a.categoryLabel.localeCompare(b.categoryLabel)
    if (c !== 0) return c
    return (a.title || '').localeCompare(b.title || '')
  })
  return rows
}

function toCsv(rows) {
  const headers = [
    'externalId', 'sku', 'title', 'category', 'listingCategory', 'priceAmount', 'currency', 'inStock', 'permalink', 'wcCategorySlugs',
  ]
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      headers.map((h) => {
        if (h === 'category') return esc(r.categoryLabel)
        return esc(r[h])
      }).join(','),
    )
  }
  return lines.join('\n')
}

function main() {
  const outArg = process.argv.indexOf('--out')
  const outDir = outArg >= 0 ? process.argv[outArg + 1] : path.join('scripts', 'output')
  const stamp = new Date().toISOString().slice(0, 10)
  const jsonPath = path.join(outDir, `monarch-pricelist-${stamp}.json`)
  const csvPath = path.join(outDir, `monarch-pricelist-${stamp}.csv`)

  fs.mkdirSync(outDir, { recursive: true })

  console.log(`Fetching ${BASE} ...`)
  fetchAll()
    .then((rows) => {
      const summary = {
        vendor: 'monarch-reptiles',
        source: `${BASE}/wp-json/wc/store/v1/products`,
        exportedAt: new Date().toISOString(),
        filters: ['tarantulas', 'enclosures (terrariums)', 'substrates'],
        counts: {
          tarantulas: rows.filter((r) => r.listingCategory === 'tarantulas').length,
          enclosures: rows.filter((r) => r.listingCategory === 'terrariums').length,
          substrates: rows.filter((r) => r.listingCategory === 'substrates').length,
          total: rows.length,
        },
        items: rows,
      }
      fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8')
      fs.writeFileSync(csvPath, toCsv(rows), 'utf8')
      console.log(`Wrote ${rows.length} rows`)
      console.log(`  JSON: ${jsonPath}`)
      console.log(`  CSV:  ${csvPath}`)
      console.log('Counts:', summary.counts)
    })
    .catch((err) => {
      console.error(err.message || err)
      process.exit(1)
    })
}

main()
