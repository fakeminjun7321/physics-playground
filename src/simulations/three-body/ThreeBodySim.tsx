import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#fbbf24'
const G = 1
const TRAIL = 800

interface Body { x: number; y: number; vx: number; vy: number; mass: number }

const PRESETS = {
  'Figure-8': () => [
    { x: -0.97, y: 0.243, vx: 0.466, vy: 0.432, mass: 1 },
    { x: 0.97, y: -0.243, vx: 0.466, vy: 0.432, mass: 1 },
    { x: 0, y: 0, vx: -0.932, vy: -0.864, mass: 1 },
  ],
  'Euler': () => [
    { x: -1, y: 0, vx: 0, vy: 0.5, mass: 1 },
    { x: 1, y: 0, vx: 0, vy: -0.5, mass: 1 },
    { x: 0, y: 0, vx: 0, vy: 0, mass: 1 },
  ],
  'Lagrange': () => {
    const r = 1.2
    return [
      { x: r * Math.cos(0), y: r * Math.sin(0), vx: -0.5 * Math.sin(0), vy: 0.5 * Math.cos(0), mass: 1 },
      { x: r * Math.cos(2 * Math.PI / 3), y: r * Math.sin(2 * Math.PI / 3), vx: -0.5 * Math.sin(2 * Math.PI / 3), vy: 0.5 * Math.cos(2 * Math.PI / 3), mass: 1 },
      { x: r * Math.cos(4 * Math.PI / 3), y: r * Math.sin(4 * Math.PI / 3), vx: -0.5 * Math.sin(4 * Math.PI / 3), vy: 0.5 * Math.cos(4 * Math.PI / 3), mass: 1 },
    ]
  },
  'Sun-Planet-Moon': () => [
    { x: 0, y: 0, vx: 0, vy: 0, mass: 20 },
    { x: 3, y: 0, vx: 0, vy: 2.6, mass: 0.5 },
    { x: 3.3, y: 0, vx: 0, vy: 3.8, mass: 0.01 },
  ],
}

export default function ThreeBodySim() {
  const [preset, setPreset] = useState<keyof typeof PRESETS>('Figure-8')
  const [timeScale, setTimeScale] = useState(1)
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodiesRef = useRef<Body[]>(PRESETS[preset]())
  const trails = useRef<{ x: number; y: number }[][]>([[], [], []])
  const colors = ['#22d3ee', '#f472b6', '#fbbf24']

  const reset = useCallback(() => {
    bodiesRef.current = PRESETS[preset]()
    trails.current = [[], [], []]
    setPlaying(false)
  }, [preset])

  useEffect(() => { reset() }, [preset, reset])

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

    const cx = w / 2, cy = h / 2
    const scale = Math.min(w, h) / 8
    const bodies = bodiesRef.current

    // Trails
    for (let i = 0; i < 3; i++) {
      const t = trails.current[i]
      for (let j = 1; j < t.length; j++) {
        const alpha = j / t.length * 0.5
        ctx.strokeStyle = colors[i]
        ctx.globalAlpha = alpha
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx + t[j - 1].x * scale, cy + t[j - 1].y * scale)
        ctx.lineTo(cx + t[j].x * scale, cy + t[j].y * scale)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // Bodies
    for (let i = 0; i < 3; i++) {
      const b = bodies[i]
      const r = Math.max(4, Math.log(b.mass + 1) * 5)
      ctx.shadowColor = colors[i]
      ctx.shadowBlur = 12
      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.arc(cx + b.x * scale, cy + b.y * scale, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Total energy
    let ke = 0, pe = 0
    for (const b of bodies) ke += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy)
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const dx = bodies[j].x - bodies[i].x, dy = bodies[j].y - bodies[i].y
      pe -= G * bodies[i].mass * bodies[j].mass / Math.sqrt(dx * dx + dy * dy + 0.01)
    }
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(`E = ${(ke + pe).toFixed(4)}`, 12, 24)

    ctx.restore()
  }, [])

  useAnimation((dt) => {
    const bodies = bodiesRef.current
    const steps = 20
    const subDt = dt * timeScale / steps

    for (let s = 0; s < steps; s++) {
      const acc = bodies.map(() => ({ ax: 0, ay: 0 }))
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        const dx = bodies[j].x - bodies[i].x
        const dy = bodies[j].y - bodies[i].y
        const r2 = dx * dx + dy * dy + 0.001
        const r = Math.sqrt(r2)
        const f = G / r2
        acc[i].ax += f * bodies[j].mass * dx / r
        acc[i].ay += f * bodies[j].mass * dy / r
        acc[j].ax -= f * bodies[i].mass * dx / r
        acc[j].ay -= f * bodies[i].mass * dy / r
      }
      for (let i = 0; i < 3; i++) {
        bodies[i].vx += acc[i].ax * subDt
        bodies[i].vy += acc[i].ay * subDt
        bodies[i].x += bodies[i].vx * subDt
        bodies[i].y += bodies[i].vy * subDt
      }
    }

    for (let i = 0; i < 3; i++) {
      trails.current[i].push({ x: bodies[i].x, y: bodies[i].y })
      if (trails.current[i].length > TRAIL) trails.current[i].shift()
    }
    draw()
  }, playing)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Three-Body Problem" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <div className="space-y-1">
          <span className="text-xs text-navy-500">Preset</span>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(k => (
              <button key={k} onClick={() => setPreset(k)} className={`py-1.5 rounded text-xs font-medium transition-colors ${preset === k ? 'bg-yellow-500/20 text-yellow-400' : 'bg-navy-800 text-navy-400'}`}>{k}</button>
            ))}
          </div>
        </div>
        <Slider label="Time Scale" value={timeScale} min={0.1} max={3} step={0.1} onChange={setTimeScale} />
        <PhysicsInfo title="Physics Behind This">
          <p>The three-body problem has no general closed-form solution (Poincaré, 1890). Each body obeys:</p>
          <Eq>{"m_i·a_i = Σ G·m_i·m_j / |r_ij|² · r̂_ij"}</Eq>
          <p>Special periodic solutions exist (Figure-8 by Chenciner & Montgomery, 2000). Most initial conditions lead to chaotic trajectories.</p>
          <p>The system conserves total energy E = KE + PE, which you can monitor at the top.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
