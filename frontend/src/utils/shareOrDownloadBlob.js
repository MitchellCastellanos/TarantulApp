import { Capacitor } from '@capacitor/core'

/** @param {string} name */
export function sanitizeFilename(name) {
  return String(name || 'download').replace(/[/\\?%*:|"<>]/g, '-')
}

/** @param {Blob} blob */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '')
      const comma = dataUrl.indexOf(',')
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl)
    }
    reader.onerror = () => reject(reader.error || new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

/** Revocar blob: URL después de un delay — revocar en el mismo tick que `.click()` rompe la descarga en Chrome/Edge/Safari. */
function scheduleRevokeObjectURL(url) {
  if (typeof window === 'undefined') {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
    return
  }
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }, 60_000)
}

/**
 * Descarga vía `<a download>` (Web y fallback en WebView si falla el share nativo).
 * @param {Blob} blob
 * @param {string} filename
 */
function anchorDownloadBlobUrl(blob, filename) {
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    scheduleRevokeObjectURL(url)
  }
}

/**
 * Algunos WebViews (p. ej. Android/Capacitor) ignoran `<a download>` con blob: o data:.
 * Intenta Web Share con archivos, luego escribe en caché y abre el sheet nativo.
 * @param {Blob|ArrayBuffer} blob
 * @param {string} [filename]
 * @param {string} [mimeType]
 * @param {string} [title]
 * @param {string} [dialogTitle]
 */
export async function shareOrDownloadBlob({
  blob,
  filename,
  mimeType,
  title,
  dialogTitle,
}) {
  const name = sanitizeFilename(filename || 'download')
  const mt = mimeType || (blob && 'type' in blob && blob.type) || 'application/octet-stream'
  const b = blob instanceof Blob ? blob : new Blob([blob], { type: mt })

  if (Capacitor.isNativePlatform()) {
    const shareTitle = title || name
    const dTitle = dialogTitle || shareTitle

    if (await tryNavigatorShareFiles(b, name, mt, shareTitle)) return

    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const base64 = await blobToBase64(b)
    const path = `ta-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${name}`

    let uri
    try {
      const wf = await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Cache,
      })
      uri = wf.uri
      if (!String(uri).startsWith('file:')) {
        const gu = await Filesystem.getUri({ directory: Directory.Cache, path })
        uri = gu.uri
      }
    } catch {
      uri = null
    }

    if (uri && String(uri).startsWith('file:')) {
      try {
        await Share.share({
          title: shareTitle,
          text: shareTitle,
          files: [String(uri)],
          dialogTitle: dTitle,
        })
        return
      } catch {
        /* cancelado o error: seguir con otros fallbacks */
      }
    }

    if (await tryNavigatorShareFiles(b, name, mt, shareTitle)) return

    if (uri && String(uri).startsWith('file:')) {
      try {
        await Share.share({
          title: shareTitle,
          url: String(uri),
          dialogTitle: dTitle,
        })
        return
      } catch {
        /* cancelado o error: anchor fallback abajo */
      }
    }

    anchorDownloadBlobUrl(b, name)
    return
  }

  anchorDownloadBlobUrl(b, name)
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} mimeType
 * @param {string} title
 * @returns {Promise<boolean>} true si se compartió o el usuario canceló
 */
async function tryNavigatorShareFiles(blob, filename, mimeType, title) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
  try {
    const file = new File([blob], filename, { type: mimeType })
    const data = { files: [file], title: title || filename }
    if (navigator.canShare && !navigator.canShare(data)) return false
    await navigator.share(data)
    return true
  } catch (e) {
    /* Cancelación del sheet: intentar siguiente método (p. ej. descarga con <a>). */
    return false
  }
}

/**
 * @param {string} dataUrl
 * @param {string} filename
 * @param {{ mimeType?: string, title?: string, dialogTitle?: string }} [options]
 */
export async function shareOrDownloadDataUrl(dataUrl, filename, options = {}) {
  let blob
  try {
    const res = await fetch(String(dataUrl))
    blob = await res.blob()
  } catch {
    const s = String(dataUrl)
    const comma = s.indexOf(',')
    if (comma < 0 || !s.startsWith('data:')) {
      throw new Error('invalid data url')
    }
    const header = s.slice(0, comma)
    const base64 = s.slice(comma + 1)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const mimeMatch = /^data:([^;,]+)/.exec(header)
    const mime = mimeMatch?.[1] || options.mimeType || 'application/octet-stream'
    blob = new Blob([bytes], { type: mime })
  }
  return shareOrDownloadBlob({
    blob,
    filename,
    mimeType: options.mimeType || blob.type,
    title: options.title,
    dialogTitle: options.dialogTitle,
  })
}
