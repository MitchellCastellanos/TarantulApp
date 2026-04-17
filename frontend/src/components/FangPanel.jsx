function FangCorner({ pos }) {
  const base = { position: 'absolute', pointerEvents: 'none', zIndex: 10, width: 64, height: 64 }
  const transforms = {
    tl: { top: -3, left: -3 },
    tr: { top: -3, right: -3, transform: 'scaleX(-1)' },
    bl: { bottom: -3, left: -3, transform: 'scaleY(-1)' },
    br: { bottom: -3, right: -3, transform: 'scale(-1,-1)' },
  }
  const style = { ...base, ...transforms[pos], filter: 'drop-shadow(0 0 4px rgba(140,90,255,0.55))' }

  return (
    <svg style={style} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      {/* Corner L-bracket lines */}
      <line x1="4" y1="4" x2="58" y2="4" stroke="rgba(130,85,235,0.72)" strokeWidth="1.5" />
      <line x1="4" y1="4" x2="4" y2="58" stroke="rgba(130,85,235,0.72)" strokeWidth="1.5" />
      {/* Corner diamond pip */}
      <polygon points="4,0.5 7.5,4 4,7.5 0.5,4"
               fill="rgba(85,50,185,0.85)" stroke="rgba(175,135,255,0.9)" strokeWidth="0.7" />
      {/* Fang hanging from horizontal arm */}
      <path d="M 20,4 C 17,9 16,17 18,27 C 19,31 23,31 24,27 C 25,31 29,31 30,27 C 32,17 31,9 28,4 Z"
            fill="rgba(65,38,148,0.82)" stroke="rgba(165,125,255,0.8)" strokeWidth="0.8" />
      {/* Fang extending from vertical arm */}
      <path d="M 4,20 C 9,17 17,16 27,18 C 31,19 31,23 27,24 C 31,25 31,29 27,30 C 17,32 9,31 4,28 Z"
            fill="rgba(65,38,148,0.75)" stroke="rgba(165,125,255,0.75)" strokeWidth="0.8" />
    </svg>
  )
}

export default function FangPanel({ children, className = '', style = {} }) {
  return (
    <div style={{ position: 'relative', overflow: 'visible', ...style }} className={className}>
      <FangCorner pos="tl" />
      <FangCorner pos="tr" />
      <FangCorner pos="bl" />
      <FangCorner pos="br" />
      {/* Inner border glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        border: '1px solid rgba(110,65,210,0.4)',
        borderRadius: 'inherit',
        boxShadow: '0 0 28px rgba(80,40,200,0.12), inset 0 0 35px rgba(0,0,0,0.28)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
