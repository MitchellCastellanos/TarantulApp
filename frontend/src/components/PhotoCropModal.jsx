import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'

/** Recorta imageSrc en el área seleccionada y devuelve un Blob JPEG 600×600. */
async function cropToBlob(imageSrc, pixelCrop) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })
  const SIZE = 600
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  canvas.getContext('2d').drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, SIZE, SIZE
  )
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88))
}

/**
 * Modal de recorte cuadrado.
 * Props:
 *   imageSrc  – data URL de la imagen original
 *   onConfirm(blob) – se llama con el Blob recortado
 *   onCancel()
 */
export default function PhotoCropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setBusy(true)
    try {
      const blob = await cropToBlob(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.82)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">✂️ Ajustar foto</h5>
            <button className="btn-close" onClick={onCancel} />
          </div>

          <div className="modal-body p-0">
            {/* Área de recorte */}
            <div style={{ position: 'relative', height: 320, background: '#111' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Control de zoom */}
            <div className="d-flex align-items-center gap-2 px-3 py-2"
                 style={{ background: 'var(--ta-parchment-dk)' }}>
              <span className="small text-muted">🔍</span>
              <input
                type="range" className="form-range"
                min={1} max={3} step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
              />
              <span className="small text-muted">+</span>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
              Cancelar
            </button>
            <button className="btn btn-dark btn-sm" onClick={handleConfirm} disabled={busy}>
              {busy ? 'Procesando...' : 'Usar esta foto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
