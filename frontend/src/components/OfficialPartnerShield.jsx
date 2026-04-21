function svgGradientSafeId(raw) {
  return String(raw || 'x').replace(/[^a-zA-Z0-9_-]/g, '')
}

/**
 * Escudo / check para socios oficiales (gradiente fijo de marca).
 * @param {{ idPrefix?: string, width?: number, height?: number, className?: string }} [props]
 */
export default function OfficialPartnerShield({ idPrefix = 'shield', width = 44, height = 48, className = '' }) {
  const gid = svgGradientSafeId(idPrefix)
  return (
    <svg
      className={`official-partner-shield ${className}`.trim()}
      viewBox="0 0 48 52"
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`og-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2d98c" />
          <stop offset="42%" stopColor="#d4b456" />
          <stop offset="100%" stopColor="#7a5a22" />
        </linearGradient>
      </defs>
      <path fill={`url(#og-${gid})`} d="M24 2 L44 10 L44 26 Q44 38 24 50 Q4 38 4 26 L4 10 Z" />
      <path fill="rgba(6,4,18,0.88)" d="M24 8 L38 14 L38 26 Q38 34 24 42 Q10 34 10 26 L10 14 Z" />
      <path fill="none" stroke="rgba(232,208,130,0.95)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M17.5 23.5 L22.5 28.5 L33 18" />
    </svg>
  )
}
