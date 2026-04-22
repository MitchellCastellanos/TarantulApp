/**
 * Builds public/qr-launch-montreal-2026.png: QR (high ECC) + centered logo on white pad.
 * Run from frontend: node scripts/composite-launch-qr.mjs
 */
import QRCode from 'qrcode'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outPath = path.join(root, 'public', 'qr-launch-montreal-2026.png')
const logoPath = path.join(root, 'public', 'logo-black.png')
const url = 'https://tarantulapp.com/launch'

const size = 720
const qrBuffer = await QRCode.toBuffer(url, {
  width: size,
  margin: 2,
  errorCorrectionLevel: 'H',
  color: { dark: '#1a120aff', light: '#ffffffff' },
})

const logoSize = Math.round(size * 0.2)
const logoRaw = await sharp(logoPath).resize(logoSize, logoSize, { fit: 'contain' }).ensureAlpha().toBuffer()
const pad = Math.round(logoSize * 0.18)
const padded = await sharp({
  create: {
    width: logoSize + pad * 2,
    height: logoSize + pad * 2,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: logoRaw, left: pad, top: pad }])
  .png()
  .toBuffer()

const meta = await sharp(qrBuffer).metadata()
const pw = meta.width || size
const ph = meta.height || size
const bw = (await sharp(padded).metadata()).width || logoSize + pad * 2
const bh = (await sharp(padded).metadata()).height || logoSize + pad * 2
const left = Math.round((pw - bw) / 2)
const top = Math.round((ph - bh) / 2)

await sharp(qrBuffer).composite([{ input: padded, left, top }]).png().toFile(outPath)
console.log('Wrote', outPath)
