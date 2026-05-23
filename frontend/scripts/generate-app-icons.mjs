/**
 * Generates PWA icons, favicon source cleanup, Android mipmaps, and maskable variants
 * from public/logo-neon.png.
 *
 * Run: npm run icons   (from frontend/)
 */
import sharp from 'sharp'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const androidRes = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')

const BG = { r: 0x1a, g: 0x1a, b: 0x2e, alpha: 1 }
const WHITE_MIN = 245
/** Slightly larger than the canvas so the emblem fills the squircle area (less “floating coin”). */
const ANY_BLEED_SCALE = 1.14
/** Maskable safe zone (~inner 80% circle); keep artwork inside this fraction of the side. */
const MASKABLE_CONTENT = 0.72

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

async function processedLogoSharp() {
  const inputPath = join(publicDir, 'logo-neon.png')
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

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

/** Full-bleed square icon for “any” / launcher (emblem scaled up, center-cropped). */
function renderAnySquare(logoSharp, size, bleedScale = ANY_BLEED_SCALE) {
  const inner = Math.max(size + 1, Math.round(size * bleedScale))
  const left = Math.floor((inner - size) / 2)
  const top = Math.floor((inner - size) / 2)

  return logoSharp
    .clone()
    .resize(inner, inner)
    .extract({ left, top, width: size, height: size })
    .ensureAlpha()
    .png()
}

/** Maskable: smaller artwork so circle/squircle masks do not clip detail. */
async function renderMaskableSquare(logoSharp, size) {
  const inner = Math.max(1, Math.round(size * MASKABLE_CONTENT))
  const emblem = await logoSharp.clone().resize(inner, inner).png().toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: emblem, gravity: 'center' }])
    .png()
}

async function main() {
  const logo = await processedLogoSharp()

  const neonBuf = await logo.png().toBuffer()
  await sharp(neonBuf).toFile(join(publicDir, 'logo-neon.png'))

  await renderAnySquare(logo, 192).toFile(join(publicDir, 'icon-192.png'))
  await renderAnySquare(logo, 512).toFile(join(publicDir, 'icon-512.png'))

  await (await renderMaskableSquare(logo, 192)).toFile(join(publicDir, 'icon-maskable-192.png'))
  await (await renderMaskableSquare(logo, 512)).toFile(join(publicDir, 'icon-maskable-512.png'))

  const fgSizes = [
    ['mipmap-mdpi', 108],
    ['mipmap-hdpi', 162],
    ['mipmap-xhdpi', 216],
    ['mipmap-xxhdpi', 324],
    ['mipmap-xxxhdpi', 432],
  ]

  for (const [folder, px] of fgSizes) {
    const png = await renderAnySquare(logo, px).toBuffer()
    await sharp(png).toFile(join(androidRes, folder, 'ic_launcher_foreground.png'))
  }

  const legacySizes = [
    ['mipmap-mdpi', 48],
    ['mipmap-hdpi', 72],
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192],
  ]

  for (const [folder, px] of legacySizes) {
    const buf = await renderAnySquare(logo, px).toBuffer()
    await sharp(buf).toFile(join(androidRes, folder, 'ic_launcher.png'))
    await sharp(buf).toFile(join(androidRes, folder, 'ic_launcher_round.png'))
  }

  // Open Graph card for community / keeper social shares (1200×630).
  const ogW = 1200
  const ogH = 630
  const emblemSize = 360
  const emblem = await renderAnySquare(logo, emblemSize).png().toBuffer()
  const ogBase = sharp({
    create: { width: ogW, height: ogH, channels: 4, background: BG },
  })
  const radial = Buffer.from(
    `<svg width="${ogW}" height="${ogH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stop-color="#a020f0" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#1a1a2e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`
  )
  await ogBase
    .composite([
      { input: radial, top: 0, left: 0 },
      { input: emblem, top: Math.round((ogH - emblemSize) / 2) - 24, left: Math.round((ogW - emblemSize) / 2) },
    ])
    .png()
    .toFile(join(publicDir, 'og-social.png'))

  console.log('Icons OK: PWA, Android foreground + legacy mipmaps, logo-neon.png, og-social.png.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
