/* Corner chelicera — realistic curved fang shape */
function FangCorner({ pos }) {
  const w = 96, h = 96
  const base = { position: 'absolute', pointerEvents: 'none', zIndex: 10, width: w, height: h }
  const offsets = {
    tl: { top: -6, left: -6 },
    tr: { top: -6, right: -6, transform: 'scaleX(-1)' },
    bl: { bottom: -6, left: -6, transform: 'scaleY(-1)' },
    br: { bottom: -6, right: -6, transform: 'scale(-1,-1)' },
  }
  const style = {
    ...base, ...offsets[pos],
    filter: 'drop-shadow(0 0 7px rgba(115,70,248,0.72))',
  }

  return (
    <svg style={style} viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      {/* Main L-bracket arms */}
      <line x1="7" y1="7" x2="84" y2="7" stroke="rgba(130,85,242,0.88)" strokeWidth="2.5"/>
      <line x1="7" y1="7" x2="7" y2="84" stroke="rgba(130,85,242,0.88)" strokeWidth="2.5"/>
      {/* Inner parallel accent lines */}
      <line x1="7" y1="12" x2="55" y2="12" stroke="rgba(130,85,242,0.22)" strokeWidth="1"/>
      <line x1="12" y1="7" x2="12" y2="55" stroke="rgba(130,85,242,0.22)" strokeWidth="1"/>
      {/* End tick marks on arm tips */}
      <line x1="80" y1="3.5" x2="80" y2="11.5" stroke="rgba(168,132,255,0.88)" strokeWidth="2"/>
      <line x1="3.5" y1="80" x2="11.5" y2="80" stroke="rgba(168,132,255,0.88)" strokeWidth="2"/>
      {/* Mid-arm ticks */}
      <line x1="46" y1="4" x2="46" y2="11" stroke="rgba(168,132,255,0.45)" strokeWidth="1.2"/>
      <line x1="4" y1="46" x2="11" y2="46" stroke="rgba(168,132,255,0.45)" strokeWidth="1.2"/>

      {/* Corner ornament: multi-point star */}
      <polygon points="7,1 11.5,4.5 14.5,7 11.5,9.5 7,13 2.5,9.5 -0.5,7 2.5,4.5"
               fill="rgba(78,44,178,0.94)" stroke="rgba(182,148,255,0.97)" strokeWidth="0.7"/>

      {/* PRIMARY CHELICERA — horizontal arm (large, realistic spider fang curve) */}
      <path d="M 28,7
               C 25,7 23,10 22,16
               C 20,24 21,35 24,44
               C 25.5,49 28.5,50 30.5,46
               C 32.5,50 35.5,49 37,44
               C 40,35 41,24 39,16
               C 38,10 36,7 33,7 Z"
            fill="rgba(48,26,124,0.92)" stroke="rgba(148,108,252,0.9)" strokeWidth="1.2"/>

      {/* SECONDARY CHELICERA — horizontal arm (smaller) */}
      <path d="M 50,7
               C 48,7 46,9.5 45.5,14.5
               C 45,21 46,30 48,37
               C 48.5,41 50.5,41.5 51.5,38.5
               C 52.5,41.5 54.5,41 55,37
               C 57,30 58,21 57.5,14.5
               C 57,9.5 55,7 53,7 Z"
            fill="rgba(48,26,124,0.74)" stroke="rgba(148,108,252,0.72)" strokeWidth="0.9"/>

      {/* PRIMARY CHELICERA — vertical arm */}
      <path d="M 7,28
               C 7,25 10,23 16,22
               C 24,20 35,21 44,24
               C 49,25.5 50,28.5 46,30.5
               C 50,32.5 49,35.5 44,37
               C 35,40 24,41 16,39
               C 10,38 7,36 7,33 Z"
            fill="rgba(48,26,124,0.88)" stroke="rgba(148,108,252,0.85)" strokeWidth="1.2"/>

      {/* SECONDARY CHELICERA — vertical arm */}
      <path d="M 7,50
               C 7,48 9.5,46 14.5,45.5
               C 21,45 30,46 37,48
               C 41,48.5 41.5,50.5 38.5,51.5
               C 41.5,52.5 41,54.5 37,55
               C 30,57 21,58 14.5,57.5
               C 9.5,57 7,55 7,53 Z"
            fill="rgba(48,26,124,0.7)" stroke="rgba(148,108,252,0.68)" strokeWidth="0.9"/>
    </svg>
  )
}

/* Center-edge accent — small fang pointing inward, placed at top or bottom mid-edge */
function EdgeFang({ pos }) {
  const isTop = pos === 'top'
  const style = {
    position: 'absolute',
    left: '50%',
    transform: `translateX(-50%) ${isTop ? '' : 'scaleY(-1)'}`,
    top:    isTop ? -7  : undefined,
    bottom: isTop ? undefined : -7,
    pointerEvents: 'none',
    zIndex: 10,
    filter: 'drop-shadow(0 0 5px rgba(115,70,248,0.6))',
  }
  return (
    <svg style={style} viewBox="0 0 56 22" width="56" height="22" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="3.5" x2="56" y2="3.5" stroke="rgba(130,85,242,0.6)" strokeWidth="1.8"/>
      {/* Central fang */}
      <path d="M 19,3.5
               C 17,3.5 16,6 15.5,9.5
               C 15,14 16,19 18,21
               C 19,22 21,22 22,21
               C 23,22 25,22 26,21
               C 28,19 29,14 28.5,9.5
               C 28,6 27,3.5 25,3.5 Z"
            fill="rgba(48,26,124,0.88)" stroke="rgba(148,108,252,0.85)" strokeWidth="1"/>
      {/* Center diamond on the line */}
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
      {/* Inner border with neon glow */}
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
