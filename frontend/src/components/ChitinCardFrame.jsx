import { useState } from 'react'
import { publicUrl } from '../utils/publicAssets.js'
import FangPanel from './FangPanel'

/**
 * Marco chitin completo (`card-chitin-frame.png`) o, si falla la carga,
 * el mismo marco de esquinas que FangPanel (`fang-corner.png`), adaptado al recuadro.
 */
export default function ChitinCardFrame({
  children,
  className = '',
  style = {},
  showSilhouettes = true,
  /** 'auth' = login/composer/forms: sin borde de card; padding interior para alejar contenido de los colmillos */
  variant = 'default',
}) {
  const [ringOk, setRingOk] = useState(true)
  const authClass = variant === 'auth' ? 'ta-chitin-frame--auth' : ''

  const inner = (
    <>
      <div className="ta-chitin-frame__plate" aria-hidden />
      {showSilhouettes && (
        <>
          <img
            className="ta-chitin-frame__silhouette ta-chitin-frame__silhouette--l"
            src={publicUrl('card-spider-silhouette.png')}
            alt=""
            aria-hidden
          />
          <img
            className="ta-chitin-frame__silhouette ta-chitin-frame__silhouette--r"
            src={publicUrl('card-spider-silhouette.png')}
            alt=""
            aria-hidden
          />
        </>
      )}
      <div className="ta-chitin-frame__content">{children}</div>
    </>
  )

  if (!ringOk) {
    return (
      <FangPanel
        className={`ta-chitin-frame-fang-wrap ${className}`.trim()}
        style={style}
        cornerOffset={variant === 'auth' ? 0 : -4}
      >
        <div className={`ta-chitin-frame ta-chitin-frame--fang-fallback ${authClass}`.trim()}>{inner}</div>
      </FangPanel>
    )
  }

  return (
    <div className={`ta-chitin-frame ${authClass} ${className}`.trim()} style={style}>
      {inner}
      <img
        className="ta-chitin-frame__ring"
        src={publicUrl('card-chitin-frame.png')}
        alt=""
        aria-hidden
        onError={() => setRingOk(false)}
      />
    </div>
  )
}
