import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#fbbf24'
const HISTORY = 400

interface State { q: number; i: number }

export default function RLCSim() {
  const [R, setR] = useState(10)
  const [L, setL] = useState(0.1)
  const [C, setC] = useState(0.001)
  const [V0, setV0] = useState(5)
  const [driveFreq, setDriveFreq] = useState(0) // 0 = free, >0 = driven
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<State>({ q: V0 * C, i: 0 })
  const timeRef = useRef(0)
  const history = useRef<{ t: number; q: number; i: number; v: number }[]>([])

  const paramsRef = useRef({ R, L, C, driveFreq })
  paramsRef.current = { R, L, C, driveFreq }

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const hist = history.current
    if (hist.length < 2) {
      ctx.fillStyle = '#475569'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Press Play to start the RLC circuit', w / 2, h / 2)
      ctx.restore(); return
    }

    const margin = { left: 60, right: 20, top: 30, bottom: 40 }
    const pw = w - margin.left - margin.right
    const ph = h - margin.top - margin.bottom

    const maxT = hist[hist.length - 1].t
    const startT = Math.max(0, maxT - 2)
    const visible = hist.filter(p => p.t >= startT)
    if (visible.length < 2) { ctx.restore(); return }

    const maxVal = Math.max(...visible.map(p => Math.max(Math.abs(p.q / C), Math.abs(p.i))), 0.01)

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (i / 4) * ph
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + pw, y); ctx.stroke()
    }

    // Voltage across C
    ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.beginPath()
    let first = true
    for (const p of visible) {
      const x = margin.left + ((p.t - startT) / 2) * pw
      const y = margin.top + ph / 2 - (p.q / C / maxVal) * ph / 2
      if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Current
    ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 2; ctx.beginPath()
    first = true
    for (const p of visible) {
      const x = margin.left + ((p.t - startT) / 2) * pw
      const y = margin.top + ph / 2 - (p.i / maxVal) * ph / 2
      if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Zero line
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(margin.left, margin.top + ph / 2); ctx.lineTo(margin.left + pw, margin.top + ph / 2); ctx.stroke()

    // Labels
    ctx.font = '11px sans-serif'
    ctx.fillStyle = '#22d3ee'; ctx.fillText('Vc (voltage)', margin.left, margin.top - 10)
    ctx.fillStyle = '#f472b6'; ctx.fillText('I (current)', margin.left + 100, margin.top - 10)

    // Info
    const omega0 = 1 / Math.sqrt(L * C)
    const gamma = R / (2 * L)
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`ω₀ = ${omega0.toFixed(1)} rad/s`, 12, h - 10)
    ctx.fillText(`γ = ${gamma.toFixed(1)}`, 180, h - 10)
    ctx.fillText(gamma < omega0 ? 'underdamped' : gamma === omega0 ? 'critical' : 'overdamped', 300, h - 10)

    ctx.restore()
  }, [C])

  useAnimation((dt) => {
    const p = paramsRef.current
    const s = stateRef.current
    const steps = 20; const subDt = dt / steps
    for (let step = 0; step < steps; step++) {
      // Lq'' + Rq' + q/C = V(t)
      // q' = i, i' = (V(t) - Ri - q/C) / L
      const V = p.driveFreq > 0 ? 5 * Math.sin(p.driveFreq * timeRef.current) : 0
      const di = (V - p.R * s.i - s.q / p.C) / p.L
      s.i += di * subDt
      s.q += s.i * subDt
      timeRef.current += subDt
    }
    history.current.push({ t: timeRef.current, q: s.q, i: s.i, v: s.q / p.C })
    if (history.current.length > HISTORY) history.current.shift()
    draw()
  }, playing)

  const reset = useCallback(() => {
    stateRef.current = { q: V0 * C, i: 0 }
    timeRef.current = 0; history.current = []
    setPlaying(false); draw()
  }, [V0, C, draw])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const pr = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = pr.clientWidth * dpr; c.height = pr.clientHeight * dpr; c.style.width = `${pr.clientWidth}px`; c.style.height = `${pr.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="RLC Circuit" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <Slider label="R (resistance)" value={R} min={0.1} max={100} step={0.5} unit="Ω" onChange={setR} />
        <Slider label="L (inductance)" value={L} min={0.01} max={1} step={0.01} unit="H" onChange={setL} />
        <Slider label="C (capacitance)" value={C} min={0.0001} max={0.01} step={0.0001} unit="F" onChange={setC} />
        <Slider label="V₀ (initial)" value={V0} min={1} max={20} step={0.5} unit="V" onChange={setV0} />
        <Slider label="Drive freq (0=free)" value={driveFreq} min={0} max={200} step={5} unit="rad/s" onChange={setDriveFreq} />
        <PhysicsInfo title="Physics Behind This">
          <p>Kirchhoff's voltage law for an RLC circuit:</p>
          <Eq>{"L·dI/dt + R·I + Q/C = V(t)"}</Eq>
          <p>Natural frequency and damping:</p>
          <Eq>{"ω₀ = 1/√(LC),  γ = R/(2L)"}</Eq>
          <p>Three regimes: underdamped (γ &lt; ω₀), critically damped (γ = ω₀), overdamped (γ &gt; ω₀).</p>
          <p>With an AC drive, resonance occurs when ω_drive ≈ ω₀.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
