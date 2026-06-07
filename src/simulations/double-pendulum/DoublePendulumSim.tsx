import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#ef4444'
const TRAIL = 400

interface State { t1: number; t2: number; w1: number; w2: number }

function step(s: State, l1: number, l2: number, m1: number, m2: number, g: number, dt: number): State {
  // Full nonlinear equations of motion for double pendulum
  const compute = (st: State) => {
    const { t1, t2, w1, w2 } = st
    const delta = t1 - t2
    const den = 2 * m1 + m2 - m2 * Math.cos(2 * delta)
    const a1 = (-g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(delta) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(delta))) / (l1 * den)
    const a2 = (2 * Math.sin(delta) * (w1 * w1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * l2 * m2 * Math.cos(delta))) / (l2 * den)
    return { t1: w1, t2: w2, w1: a1, w2: a2 }
  }

  // RK4
  const k1 = compute(s)
  const s2: State = { t1: s.t1 + k1.t1 * dt / 2, t2: s.t2 + k1.t2 * dt / 2, w1: s.w1 + k1.w1 * dt / 2, w2: s.w2 + k1.w2 * dt / 2 }
  const k2 = compute(s2)
  const s3: State = { t1: s.t1 + k2.t1 * dt / 2, t2: s.t2 + k2.t2 * dt / 2, w1: s.w1 + k2.w1 * dt / 2, w2: s.w2 + k2.w2 * dt / 2 }
  const k3 = compute(s3)
  const s4: State = { t1: s.t1 + k3.t1 * dt, t2: s.t2 + k3.t2 * dt, w1: s.w1 + k3.w1 * dt, w2: s.w2 + k3.w2 * dt }
  const k4 = compute(s4)

  return {
    t1: s.t1 + dt / 6 * (k1.t1 + 2 * k2.t1 + 2 * k3.t1 + k4.t1),
    t2: s.t2 + dt / 6 * (k1.t2 + 2 * k2.t2 + 2 * k3.t2 + k4.t2),
    w1: s.w1 + dt / 6 * (k1.w1 + 2 * k2.w1 + 2 * k3.w1 + k4.w1),
    w2: s.w2 + dt / 6 * (k1.w2 + 2 * k2.w2 + 2 * k3.w2 + k4.w2),
  }
}

export default function DoublePendulumSim() {
  const [l1, setL1] = useState(120)
  const [l2, setL2] = useState(120)
  const [m1, setM1] = useState(2)
  const [m2, setM2] = useState(2)
  const [gravity, _setGravity] = useState(9.81)
  const [initA1, setInitA1] = useState(120)
  const [initA2, setInitA2] = useState(90)
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<State>({ t1: initA1 * Math.PI / 180, t2: initA2 * Math.PI / 180, w1: 0, w2: 0 })
  const trail2 = useRef<{ x: number; y: number }[]>([])

  const paramsRef = useRef({ l1, l2, m1, m2, gravity })
  paramsRef.current = { l1, l2, m1, m2, gravity }

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

    const cx = w / 2, cy = h * 0.3
    const { t1, t2 } = stateRef.current
    const p = paramsRef.current
    const x1 = cx + Math.sin(t1) * p.l1
    const y1 = cy + Math.cos(t1) * p.l1
    const x2 = x1 + Math.sin(t2) * p.l2
    const y2 = y1 + Math.cos(t2) * p.l2

    // Trails
    trail2.current.push({ x: x2, y: y2 })
    if (trail2.current.length > TRAIL) trail2.current.shift()
    for (let i = 1; i < trail2.current.length; i++) {
      const alpha = i / trail2.current.length
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.6})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(trail2.current[i - 1].x, trail2.current[i - 1].y)
      ctx.lineTo(trail2.current[i].x, trail2.current[i].y)
      ctx.stroke()
    }

    // Rods
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()

    // Pivot
    ctx.fillStyle = '#64748b'
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill()

    // Bobs
    const r1 = 6 + m1 * 2, r2 = 6 + m2 * 2
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath(); ctx.arc(x1, y1, r1, 0, Math.PI * 2); ctx.fill()
    ctx.shadowColor = COLOR
    ctx.fillStyle = COLOR
    ctx.beginPath(); ctx.arc(x2, y2, r2, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(`θ₁ = ${(((t1 * 180 / Math.PI) % 360 + 360) % 360).toFixed(1)}°`, 12, 24)
    ctx.fillText(`θ₂ = ${(((t2 * 180 / Math.PI) % 360 + 360) % 360).toFixed(1)}°`, 12, 40)
    ctx.restore()
  }, [])

  useAnimation((dt) => {
    const p = paramsRef.current
    const steps = 10
    const subDt = dt / steps
    for (let i = 0; i < steps; i++) {
      stateRef.current = step(stateRef.current, p.l1, p.l2, p.m1, p.m2, p.gravity * 50, subDt)
    }
    draw()
  }, playing)

  const reset = useCallback(() => {
    stateRef.current = { t1: initA1 * Math.PI / 180, t2: initA2 * Math.PI / 180, w1: 0, w2: 0 }
    trail2.current = []
    setPlaying(false)
    draw()
  }, [initA1, initA2, draw])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup()
    window.addEventListener('resize', setup)
    return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Double Pendulum (Chaos)" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <Slider label="θ₁ initial" value={initA1} min={10} max={180} step={1} unit="°" onChange={v => { setInitA1(v); if (!playing) { stateRef.current.t1 = v * Math.PI / 180; stateRef.current.w1 = 0; trail2.current = []; draw() } }} />
        <Slider label="θ₂ initial" value={initA2} min={10} max={180} step={1} unit="°" onChange={v => { setInitA2(v); if (!playing) { stateRef.current.t2 = v * Math.PI / 180; stateRef.current.w2 = 0; trail2.current = []; draw() } }} />
        <Slider label="L₁" value={l1} min={40} max={200} step={5} unit="px" onChange={setL1} />
        <Slider label="L₂" value={l2} min={40} max={200} step={5} unit="px" onChange={setL2} />
        <Slider label="m₁" value={m1} min={0.5} max={5} step={0.5} unit="kg" onChange={setM1} />
        <Slider label="m₂" value={m2} min={0.5} max={5} step={0.5} unit="kg" onChange={setM2} />
        <PhysicsInfo title="Physics Behind This">
          <p>The double pendulum is a classic example of deterministic chaos. The Lagrangian:</p>
          <Eq>{"L = ½(m₁+m₂)l₁²θ̇₁² + ½m₂l₂²θ̇₂² + m₂l₁l₂θ̇₁θ̇₂cos(θ₁-θ₂) + (m₁+m₂)gl₁cosθ₁ + m₂gl₂cosθ₂"}</Eq>
          <p>Applying Euler-Lagrange equations yields coupled nonlinear ODEs. The system is extremely sensitive to initial conditions — a hallmark of chaos.</p>
          <p>Even a 0.001° change in initial angle leads to completely divergent trajectories over time.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
