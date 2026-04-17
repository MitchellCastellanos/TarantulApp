import { publicUrl } from '../utils/publicAssets.js'

const defaultCorner = () => publicUrl('fang-corner.png')
/** Optional richer corner with visible web: save as `public/fang-corner-web.png` and pass `cornerSrc`. */

function cornerPositions(offset) {
  const o = offset
  return [
    { key: 'tl', style: { top: o, left: o } },
    { key: 'tr', style: { top: o, right: o, transform: 'scaleX(-1)' } },
    { key: 'bl', style: { bottom: o, left: o, transform: 'scaleY(-1)' } },
    { key: 'br', style: { bottom: o, right: o, transform: 'scale(-1)' } },
  ]
}

/**
 * Decorative frame: one corner PNG mirrored on all four sides.
 * Corner size scales with the panel (clamp) for mobile.
 * @param {number} [cornerOffset=-4] px from panel edge (negative = slightly outside the box)
 */
export default function FangPanel({ children, className = '', style = {}, cornerSrc, cornerOffset = -4 }) {
  const corner = cornerSrc || defaultCorner()
  const corners = cornerPositions(cornerOffset)
  return (
    <div
      className={`fang-panel ${className}`.trim()}
      style={{ position: 'relative', overflow: 'visible', ...style }}
    >
      {corners.map(({ key, style: pos }) => (
        <img
          key={key}
          src={corner}
          alt=""
          aria-hidden
          className="fang-panel__corner"
          style={pos}
        />
      ))}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
