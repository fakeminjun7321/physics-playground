import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#fb923c'
const HISTORY = 300

export default function EMInductionSim() {
  const [magnetSpeed, setMagnetSpeed] = useState(2)
  const [magnetStrength, setMagnetStrength] = useState(1)
  const [coilTurns, setCoilTurns] = useState(10)
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const history = useRef<{ t: number; emf: number; flux: number }[]>([])

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const t = timeRef.current
    const coilX = w / 2, coilY = h / 2
    const magnetX = coilX + Math.sin(t * magnetSpeed) * 180
    const coilW = 60, coilH = 80

    // Coil
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3
    for (let i = 0; i < Math.min(coilTurns, 5); i++) {
      const offset = (i - 2) * 6
      ctx.beginPath()
      ctx.ellipse(coilX + offset, coilY, coilW / 2, coilH / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Magnet
    const mw = 50, mh = 30
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(magnetX - mw, coilY - mh / 2, mw, mh)
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(magnetX, coilY - mh / 2, mw, mh)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('N', magnetX - mw / 2, coilY + 5)
    ctx.fillText('S', magnetX + mw / 2, coilY + 5)

    // Field lines
    const numLines = 6
    for (let i = 0; i < numLines; i++) {
      const startY = coilY - mh / 2 + (i + 0.5) * mh / numLines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(magnetX - mw - 20, startY)
      // Curve through magnet and beyond
      ctx.bezierCurveTo(magnetX + mw + 40, startY - 30, magnetX + mw + 40, startY + 30, magnetX - mw - 20, startY)
      ctx.stroke()
    }

    // Calculate flux and EMF
    const dist = magnetX - coilX
    const flux = magnetStrength * coilTurns / (1 + Math.pow(dist / 60, 2))
    const dFlux = -magnetStrength * coilTurns * 2 * dist * magnetSpeed * Math.cos(t * magnetSpeed) * 180 / (Math.pow(1 + Math.pow(dist / 60, 2), 2) * 3600)
    const emf = -dFlux // Faraday's law

    // EMF indicator (galvanometer)
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`Φ = ${flux.toFixed(2)} Wb`, 12, 24)
    ctx.fillText(`EMF = ${emf.toFixed(3)} V`, 12, 40)

    // Current direction indicator
    if (Math.abs(emf) > 0.01) {
      const dir = emf > 0 ? '↻' : '↺'
      ctx.fillStyle = emf > 0 ? '#22d3ee' : '#f472b6'
      ctx.font = '20px sans-serif'
      ctx.fillText(dir, coilX - 10, coilY + coilH / 2 + 25)
    }

    ctx.restore()
  }, [magnetSpeed, magnetStrength, coilTurns])

  const drawGraph = useCallback(() => {
    const canvas = graphRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const hist = history.current
    if (hist.length < 2) { ctx.restore(); return }
    const m = 6
    const maxEmf = Math.max(...hist.map(p => Math.abs(p.emf)), 0.01)

    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 1.5; ctx.beginPath()
    let first = true
    for (let i = 0; i < hist.length; i++) {
      const x = m + (i / hist.length) * (w - m * 2)
      const y = h / 2 - (hist[i].emf / maxEmf) * (h / 2 - m)
      if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(m, h / 2); ctx.lineTo(w - m, h / 2); ctx.stroke()

    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'
    ctx.fillText('EMF(t)', m, 12)
    ctx.restore()
  }, [])

  useAnimation((dt) => {
    timeRef.current += dt
    const dist = Math.sin(timeRef.current * magnetSpeed) * 180
    const flux = magnetStrength * coilTurns / (1 + Math.pow(dist / 60, 2))
    const dFlux = -magnetStrength * coilTurns * 2 * dist * magnetSpeed * Math.cos(timeRef.current * magnetSpeed) * 180 / (Math.pow(1 + Math.pow(dist / 60, 2), 2) * 3600)
    history.current.push({ t: timeRef.current, emf: -dFlux, flux })
    if (history.current.length > HISTORY) history.current.shift()
    draw(); drawGraph()
  }, playing)

  const reset = useCallback(() => { timeRef.current = 0; history.current = []; setPlaying(false); draw(); drawGraph() }, [draw, drawGraph])

  useEffect(() => {
    const setup = (c: HTMLCanvasElement | null) => { if (!c) return; const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px` }
    setup(canvasRef.current); setup(graphRef.current); draw()
    const onResize = () => { setup(canvasRef.current); setup(graphRef.current); draw(); drawGraph() }
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize)
  }, [draw, drawGraph])

  return (
    <SimulationLayout title="Electromagnetic Induction" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <Slider label="Magnet Speed" value={magnetSpeed} min={0.5} max={5} step={0.1} onChange={setMagnetSpeed} />
        <Slider label="Magnet Strength" value={magnetStrength} min={0.1} max={3} step={0.1} unit="T" onChange={setMagnetStrength} />
        <Slider label="Coil Turns" value={coilTurns} min={1} max={50} step={1} onChange={setCoilTurns} />
        <div className="rounded-lg overflow-hidden bg-navy-950 border border-navy-800" style={{ height: 120 }}>
          <canvas ref={graphRef} className="w-full h-full" />
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>Faraday's law of electromagnetic induction:</p>
          <Eq>{"EMF = -N · dΦ_B/dt"}</Eq>
          <p>The magnetic flux through the coil:</p>
          <Eq>{"Φ_B = ∫ B · dA"}</Eq>
          <p>Lenz's law: the induced current opposes the change in flux (negative sign). Faster motion or more turns = larger EMF.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
