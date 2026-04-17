import { useState, useEffect } from 'react'
import tarantulaService from '../services/tarantulaService'
import { imgUrl } from '../services/api'

export default function PhotoGallery({ tarantulaId }) {
  const [photos, setPhotos] = useState([])
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const load = () =>
    tarantulaService.getPhotos(tarantulaId).then(setPhotos)

  useEffect(() => { load() }, [tarantulaId])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    try {
      await tarantulaService.addPhoto(tarantulaId, file, caption)
      setFile(null)
      setCaption('')
      e.target.reset()
      load()
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (photoId) => {
    if (!confirm('¿Eliminar esta foto?')) return
    await tarantulaService.deletePhoto(tarantulaId, photoId)
    load()
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="ta-section-header mb-3">
          <span>📷 Galería</span>
        </div>

        {/* Upload form */}
        <form onSubmit={handleUpload} className="mb-3 d-flex gap-2 align-items-end flex-wrap">
          <div>
            <input type="file" accept="image/*" className="form-control form-control-sm"
                   style={{ maxWidth: 220 }}
                   onChange={e => setFile(e.target.files[0])} required />
          </div>
          <div>
            <input type="text" className="form-control form-control-sm" placeholder="Descripción (opcional)"
                   style={{ maxWidth: 200 }}
                   value={caption} onChange={e => setCaption(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-sm btn-dark" disabled={uploading || !file}>
            {uploading ? 'Subiendo...' : '+ Agregar foto'}
          </button>
        </form>

        {/* Grid */}
        {photos.length === 0 ? (
          <p className="text-muted small mb-0">Aún no hay fotos en la galería.</p>
        ) : (
          <div className="row g-2">
            {photos.map(p => (
              <div key={p.id} className="col-6 col-md-4 col-lg-3">
                <div className="position-relative" style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 6, background: '#1a1a2e', cursor: 'pointer' }}>
                  <img
                    src={imgUrl(p.filePath)}
                    alt={p.caption || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={() => setLightbox(p)}
                  />
                  <button
                    className="btn btn-sm btn-danger position-absolute"
                    style={{ top: 4, right: 4, padding: '1px 6px', fontSize: '0.7rem', lineHeight: 1.4 }}
                    onClick={() => handleDelete(p.id)}
                    title="Eliminar foto">
                    ✕
                  </button>
                  {p.caption && (
                    <div className="position-absolute bottom-0 start-0 end-0 px-1 py-1"
                         style={{ background: 'rgba(0,0,0,0.5)', fontSize: '0.7rem', color: 'white' }}>
                      {p.caption}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.85)', zIndex: 2000 }}
          onClick={() => setLightbox(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}
               onClick={e => e.stopPropagation()}>
            <img
              src={imgUrl(lightbox.filePath)}
              alt={lightbox.caption || ''}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
            />
            {lightbox.caption && (
              <p className="text-white text-center small mt-2 mb-0">{lightbox.caption}</p>
            )}
            <button
              className="btn btn-light btn-sm position-absolute top-0 end-0 m-2"
              onClick={() => setLightbox(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
