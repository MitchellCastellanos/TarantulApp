/**
 * Replaces corner-connected near-white pixels (PWA icon padding) with theme background.
 * Run from repo root: node frontend/scripts/fix-pwa-icons.mjs
 */
import sharp from 'sharp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const BG = { r: 0x1a, g: 0x1a, b: 0x2e }
const WHITE_MIN = 245

function isCornerWhite(r, g, b) {
  return r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN
}

function floodReplaceWhite(data, width, height, channels) {
  const visited = new Uint8Array(width * height)
  const queue = []
  const vi = (x, y) => y * width + x
  const di = (x, y) => (y * width + x) * channels

  function tryPush(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const v = vi(x, y)
    if (visited[v]) return
    const i = di(x, y)
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2]
    if (!isCornerWhite(r, g, b)) return
    visited[v] = 1
    queue.push(x, y)
  }

  tryPush(0, 0)
  tryPush(width - 1, 0)
  tryPush(0, height - 1)
  tryPush(width - 1, height - 1)

  for (let head = 0; head < queue.length; ) {
    const x = queue[head++]
    const y = queue[head++]
    tryPush(x + 1, y)
    tryPush(x - 1, y)
    tryPush(x, y + 1)
    tryPush(x, y - 1)
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[vi(x, y)]) continue
      const i = di(x, y)
      data[i] = BG.r
      data[i + 1] = BG.g
      data[i + 2] = BG.b
      if (channels === 4) data[i + 3] = 255
    }
  }
}

async function processLogo() {
  const inputPath = join(publicDir, 'logo-neon.png')
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const copy = Buffer.from(data)
  floodReplaceWhite(copy, info.width, info.height, info.channels)

  return sharp(copy, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  }).png()
}

async function main() {
  const base = await processLogo()
  const png = await base.png().toBuffer()
  await sharp(png).toFile(join(publicDir, 'logo-neon.png'))
  await sharp(png).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'))
  await sharp(png).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'))
  console.log('Wrote logo-neon.png, icon-192.png, icon-512.png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
