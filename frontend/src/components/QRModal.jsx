import { useRef } from 'react'
import QRCode from 'react-qr-code'

export default function QRModal({ tarantula, onClose }) {
  const svgRef = useRef(null)
  const url = `${window.location.origin}/t/${tarantula.shortId}`

  const downloadQR = () => {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 340
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 300, 340)
      ctx.drawImage(img, 25, 10, 250, 250)
      ctx.fillStyle = '#111'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(tarantula.name, 150, 285)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#555'
      ctx.fillText(tarantula.species?.scientificName ?? '', 150, 305)
      ctx.fillText(tarantula.shortId, 150, 325)

      const link = document.createElement('a')
      link.download = `${tarantula.name}-QR.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">QR — {tarantula.name}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body text-center">
            <div ref={svgRef} className="d-inline-block p-3 border rounded mb-3">
              <QRCode value={url} size={220} />
            </div>
            <p className="text-muted small mb-1">
              {tarantula.species?.scientificName}
            </p>
            <p className="fw-bold mb-0">{tarantula.name}</p>
            <p className="text-muted small">ID: {tarantula.shortId}</p>

            {!tarantula.isPublic && (
              <div className="alert alert-warning small py-2 mt-2">
                El perfil está privado. Activa "Perfil público" para que el QR funcione sin iniciar sesión.
              </div>
            )}
          </div>
          <div className="modal-footer justify-content-center gap-2">
            <button className="btn btn-dark" onClick={downloadQR}>
              ⬇ Descargar PNG
            </button>
            <button className="btn btn-outline-secondary" onClick={copyLink}>
              📋 Copiar link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
