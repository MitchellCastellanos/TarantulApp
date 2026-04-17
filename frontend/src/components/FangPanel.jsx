const CORNER_POS = {
  tl: { top: -6,  left: -6  },
  tr: { top: -6,  right: -6 },
  bl: { bottom: -6, left: -6  },
  br: { bottom: -6, right: -6 },
}
const CORNER_TRANSFORM = {
  tl: 'none',
  tr: 'scaleX(-1)',
  bl: 'scaleY(-1)',
  br: 'scale(-1,-1)',
}

function FangCorner({ pos }) {
  return (
    <img
      src="/fang-corner.png"
      width={96}
      height={96}
      alt=""
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 10,
        ...CORNER_POS[pos],
        transform: CORNER_TRANSFORM[pos],
        filter: 'drop-shadow(0 0 6px rgba(115,70,248,0.72))',
      }}
    />
  )
}

/* Small center-edge accent fang (SVG — no separate asset needed) */
function EdgeFang({ pos }) {
  const isTop = pos === 'top'
  return (
    <svg
      width="56" height="22"
      viewBox="0 0 56 22"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        left: '50%',
        transform: `translateX(-50%) ${isTop ? '' : 'scaleY(-1)'}`,
        top:    isTop ? -7  : undefined,
        bottom: isTop ? undefined : -7,
        pointerEvents: 'none',
        zIndex: 10,
        filter: 'drop-shadow(0 0 5px rgba(115,70,248,0.6))',
      }}
    >
      <line x1="0" y1="3.5" x2="56" y2="3.5" stroke="rgba(130,85,242,0.6)" strokeWidth="1.8"/>
      <path d="M 19,3.5 C 17,3.5 16,6 15.5,9.5 C 15,14 16,19 18,21 C 19,22 21,22 22,21 C 23,22 25,22 26,21 C 28,19 29,14 28.5,9.5 C 28,6 27,3.5 25,3.5 Z"
            fill="rgba(48,26,124,0.88)" stroke="rgba(148,108,252,0.85)" strokeWidth="1"/>
      <polygon points="22,0.5 25.5,3.5 22,6.5 18.5,3.5"
               fill="rgba(78,44,178,0.9)" stroke="rgba(182,148,255,0.95)" strokeWidth="0.7"/>
    </svg>
  )
}

export default function FangPanel({ children, className = '', style = {}, edgeFangs = true }) {
  return (
    <div style={{ position: 'relative', overflow: 'visible', ...style }} className={className}>
      <FangCorner pos="tl" />
      <FangCorner pos="tr" />
      <FangCorner pos="bl" />
      <FangCorner pos="br" />
      {edgeFangs && <EdgeFang pos="top" />}
      {edgeFangs && <EdgeFang pos="bottom" />}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        border: '1px solid rgba(115,70,230,0.45)',
        borderRadius: 'inherit',
        boxShadow: '0 0 32px rgba(80,42,210,0.14), inset 0 0 40px rgba(0,0,0,0.32)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
