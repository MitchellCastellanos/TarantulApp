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

/** @param {unknown} err */
function isUserCanceledShare(err) {
  const n = err && typeof err === 'object' && 'name' in err ? err.name : ''
  const m = String(
    err && typeof err === 'object' && 'message' in err && err.message != null
      ? err.message
      : err || '',
  )
  return n === 'AbortError' || /canceled|cancelled/i.test(m)
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
      } catch (e) {
        if (isUserCanceledShare(e)) return
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
      } catch (e) {
        if (isUserCanceledShare(e)) return
      }
    }

    return
  }

  const url = URL.createObjectURL(b)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
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
    if (isUserCanceledShare(e)) return true
    return false
  }
}

/**
 * @param {string} dataUrl
 * @param {string} filename
 * @param {{ mimeType?: string, title?: string, dialogTitle?: string }} [options]
 */
export async function shareOrDownloadDataUrl(dataUrl, filename, options = {}) {
  const res = await fetch(String(dataUrl))
  const blob = await res.blob()
  return shareOrDownloadBlob({
    blob,
    filename,
    mimeType: options.mimeType || blob.type,
    title: options.title,
    dialogTitle: options.dialogTitle,
  })
}
