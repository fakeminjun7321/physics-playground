import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#34d399'
const N = 10 // number of masses

export default function CoupledOscSim() {
  const [k, setK] = useState(20)
  const [kc, setKc] = useState(5) // coupling spring constant
  const [damping, setDamping] = useState(0.02)
  const [mode, setMode] = useState(1)
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef(new Float64Array(N))
  const velRef = useRef(new Float64Array(N))
  const timeRef = useRef(0)
  const history = useRef<Float64Array[]>([])

  const paramsRef = useRef({ k, kc, damping })
  paramsRef.current = { k, kc, damping }

  const initMode = useCallback((m: number) => {
    const pos = posRef.current
    const vel = velRef.current
    for (let i = 0; i < N; i++) {
      pos[i] = 60 * Math.sin(Math.PI * m * (i + 1) / (N + 1))
      vel[i] = 0
    }
    history.current = []
    timeRef.current = 0
  }, [])

  useEffect(() => { initMode(mode) }, [mode, initMode])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const pos = posRef.current
    const marginX = 50
    const spacing = (w - marginX * 2) / (N + 1)
    const cy = h / 2

    // Walls
    ctx.fillStyle = '#475569'
    ctx.fillRect(marginX - 8, cy - 40, 8, 80)
    ctx.fillRect(w - marginX, cy - 40, 8, 80)

    for (let i = 0; i <= N; i++) {
      const x1 = i === 0 ? marginX : marginX + i * spacing + pos[i - 1]
      const x2 = i === N ? w - marginX : marginX + (i + 1) * spacing + pos[i]

      // Spring coils between masses
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1
      ctx.beginPath()
      const coils = 8
      const segLen = (x2 - x1) / (coils * 2)
      ctx.moveTo(x1, cy)
      for (let c = 0; c < coils * 2; c++) {
        ctx.lineTo(x1 + segLen * (c + 1), cy + (c % 2 === 0 ? -8 : 8))
      }
      ctx.lineTo(x2, cy)
      ctx.stroke()
    }

    // Masses
    for (let i = 0; i < N; i++) {
      const x = marginX + (i + 1) * spacing + pos[i]
      const intensity = Math.abs(pos[i]) / 60
      ctx.shadowColor = COLOR
      ctx.shadowBlur = 10 + intensity * 10
      ctx.fillStyle = COLOR
      ctx.beginPath()
      ctx.arc(x, cy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Equilibrium markers
    ctx.setLineDash([2, 4])
    ctx.strokeStyle = '#1e293b'
    for (let i = 0; i < N; i++) {
      const x = marginX + (i + 1) * spacing
      ctx.beginPath()
      ctx.moveTo(x, cy - 30)
      ctx.lineTo(x, cy + 30)
      ctx.stroke()
    }
    ctx.setLineDash([])

    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(`Mode ${mode}  t = ${timeRef.current.toFixed(1)}s`, 12, 24)
    ctx.restore()
  }, [mode])

  const drawGraph = useCallback(() => {
    const canvas = graphRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const hist = history.current
    if (hist.length < 2) { ctx.restore(); return }
    const margin = 4
    const colors = ['#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#818cf8']
    for (let mi = 0; mi < Math.min(N, 5); mi++) {
      ctx.strokeStyle = colors[mi]
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let t = 0; t < hist.length; t++) {
        const x = margin + (t / hist.length) * (w - margin * 2)
        const y = h / 2 - (hist[t][mi] / 80) * h / 2
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = '#64748b'
    ctx.font = '10px sans-serif'
    ctx.fillText('x₁..x₅(t)', margin, 12)
    ctx.restore()
  }, [])

  useAnimation((dt) => {
    const p = paramsRef.current
    const pos = posRef.current
    const vel = velRef.current
    const steps = 10
    const subDt = dt / steps

    for (let s = 0; s < steps; s++) {
      const acc = new Float64Array(N)
      for (let i = 0; i < N; i++) {
        // Wall spring + coupling springs
        const left = i === 0 ? 0 : pos[i - 1]
        const right = i === N - 1 ? 0 : pos[i + 1]
        acc[i] = -p.k * pos[i] + p.kc * (left - pos[i]) + p.kc * (right - pos[i]) - p.damping * vel[i]
      }
      for (let i = 0; i < N; i++) {
        vel[i] += acc[i] * subDt
        pos[i] += vel[i] * subDt
      }
      timeRef.current += subDt
    }

    history.current.push(new Float64Array(pos))
    if (history.current.length > 300) history.current.shift()
    draw()
    drawGraph()
  }, playing)

  const reset = useCallback(() => { initMode(mode); setPlaying(false); draw(); drawGraph() }, [mode, initMode, draw, drawGraph])

  useEffect(() => {
    const setup = (c: HTMLCanvasElement | null) => { if (!c) return; const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px` }
    setup(canvasRef.current); setup(graphRef.current); draw()
    const onResize = () => { setup(canvasRef.current); setup(graphRef.current); draw(); drawGraph() }
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize)
  }, [draw, drawGraph])

  return (
    <SimulationLayout title="Coupled Oscillators" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <Slider label="Normal Mode" value={mode} min={1} max={N} step={1} onChange={setMode} />
        <Slider label="Spring k" value={k} min={5} max={50} step={1} unit="N/m" onChange={setK} />
        <Slider label="Coupling kc" value={kc} min={0.5} max={20} step={0.5} unit="N/m" onChange={setKc} />
        <Slider label="Damping" value={damping} min={0} max={0.5} step={0.01} onChange={setDamping} />
        <div className="rounded-lg overflow-hidden bg-navy-950 border border-navy-800" style={{ height: 140 }}>
          <canvas ref={graphRef} className="w-full h-full" />
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>N coupled oscillators have N normal modes. The n-th mode shape:</p>
          <Eq>{"xᵢ(t) = A·sin(i·n·π/(N+1))·cos(ωₙt)"}</Eq>
          <p>Normal mode frequencies:</p>
          <Eq>{"ωₙ² = k/m + 2kc/m · (1 - cos(nπ/(N+1)))"}</Eq>
          <p>Any motion can be decomposed as a superposition of these modes. This is the foundation of phonons in solid state physics.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
