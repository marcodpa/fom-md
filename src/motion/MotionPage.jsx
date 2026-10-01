// /motion: the FOM loop on its own page (not linked from the site). `?export=1` renders the bare
// 720×1280 frame that scripts/motion-export.mjs scrubs frame by frame to make the MP4.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FomLoop from './FomLoop'
import './fom-loop.css'

export default function MotionPage() {
  const [params] = useSearchParams()
  const exportMode = params.has('export')
  const [playing, setPlaying] = useState(true)
  const [key, setKey] = useState(0)
  return <main className={`motion-page${exportMode ? ' is-export' : ''}`}>
    <div>
      <div className="motion-stage"><FomLoop key={key} playing={playing} exportMode={exportMode} /></div>
      {!exportMode && <div className="motion-bar">
        <button onClick={() => setPlaying(p => !p)}>{playing ? 'Pausar' : 'Reproducir'}</button>
        <button className="is-ghost" onClick={() => { setKey(k => k + 1); setPlaying(true) }}>Reiniciar</button>
      </div>}
    </div>
  </main>
}
