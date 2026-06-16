import { useEffect, useState } from 'react'

const BARS = [
  '#38AEFF',
  '#FF3B3B',
  '#0A8A3A',
  '#7ED957',
  '#ADFF4F',
  '#7ED957',
  '#38AEFF',
]

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('bars')
  const [visible, setVisible] = useState(true)
  const [barsReady, setBarsReady] = useState(false)

  useEffect(() => {
    // trigger bar animation on next frame
    const t0 = setTimeout(() => setBarsReady(true), 50)
    const t1 = setTimeout(() => setPhase('number'), 900)
    const t2 = setTimeout(() => setPhase('exit'), 2300)
    const t3 = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 3000)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s ease',
      }}
    >
      {/* color bars */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {BARS.map((color, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: color,
              transform: barsReady ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'bottom',
              transition: `transform 0.5s ease ${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* 26 centered */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 'clamp(140px, 22vw, 260px)',
          color: '#0A1628',
          lineHeight: 0.85,
          textAlign: 'center',
          opacity: phase === 'number' ? 1 : 0,
          transform: phase === 'number' ? 'scale(1)' : 'scale(0.5)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        2<br />6
      </div>
    </div>
  )
}
