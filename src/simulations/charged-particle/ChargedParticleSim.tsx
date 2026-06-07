import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#e879f9'
const TRAIL = 1000

interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number }

export default function ChargedParticleSim() {
  const [Bz, setBz] = useState(2)
  const [Ex, setEx] = useState(0)
  const [Ey, setEy] = useState(0)
  const [initVx, setInitVx] = useState(100)
  const [initVy, _setInitVy] = useState(0)
  const [initVz, setInitVz] = useState(30)
  const [charge, setCharge] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<'xy' | '3d'>('xy')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particleRef = useRef<Particle>({ x: 0, y: 0, z: 0, vx: initVx, vy: initVy, vz: initVz })
  const trail = useRef<{ x: number; y: number; z: number }[]>([])

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2
    const p = particleRef.current
    const t = trail.current

    const project = (px: number, py: number, pz: number): [number, number] => {
      if (view === 'xy') return [cx + px * 0.8, cy - py * 0.8]
      // Simple 3D projection
      const angle = 0.5
      const sx = px * Math.cos(angle) - pz * Math.sin(angle) * 0.5
      const sy = -py + pz * Math.cos(angle) * 0.3
      return [cx + sx * 0.6, cy + sy * 0.6]
    }

    // Axes
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1
    const [ox, oy] = project(0, 0, 0)
    const [ax, ay] = project(150, 0, 0)
    const [bx, by] = project(0, 150, 0)
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ax, ay); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke()
    if (view === '3d') {
      const [zx, zy] = project(0, 0, 150)
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(zx, zy); ctx.stroke()
      ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'
      ctx.fillText('z', zx + 4, zy)
    }
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'
    ctx.fillText('x', ax + 4, ay); ctx.fillText('y', bx, by - 4)

    // Trail
    for (let i = 1; i < t.length; i++) {
      const alpha = i / t.length
      ctx.strokeStyle = `rgba(232, 121, 249, ${alpha * 0.6})`
      ctx.lineWidth = 1.5
      const [x1, y1] = project(t[i - 1].x, t[i - 1].y, t[i - 1].z)
      const [x2, y2] = project(t[i].x, t[i].y, t[i].z)
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    }

    // Particle
    const [px2, py2] = project(p.x, p.y, p.z)
    ctx.shadowColor = COLOR; ctx.shadowBlur = 15
    ctx.fillStyle = COLOR
    ctx.beginPath(); ctx.arc(px2, py2, 6, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    // B field indicator
    ctx.fillStyle = '#3b82f6'; ctx.font = '12px sans-serif'
    ctx.fillText(`B = ${Bz} ẑ ${Bz > 0 ? '⊙' : '⊗'}`, w - 100, 24)
    if (Ex !== 0 || Ey !== 0) {
      ctx.fillStyle = '#f97316'
      ctx.fillText(`E = (${Ex}, ${Ey})`, w - 100, 40)
    }

    ctx.fillStyle = '#94a3b8'; ctx.font = '11px monospace'
    ctx.fillText(`r_c = ${Math.abs(initVx / (charge * Bz)).toFixed(1)}`, 12, 24)
    ctx.fillText(`ω_c = ${Math.abs(charge * Bz).toFixed(2)} rad/s`, 12, 40)
    ctx.restore()
  }, [Bz, Ex, Ey, charge, initVx, view])

  useAnimation((dt) => {
    const p = particleRef.current
    const q = charge
    const steps = 10; const subDt = dt / steps
    for (let s = 0; s < steps; s++) {
      // Lorentz force: F = q(E + v × B)
      // B = (0, 0, Bz), so v × B = (vy*Bz, -vx*Bz, 0)
      const ax = q * (Ex + p.vy * Bz)
      const ay = q * (Ey - p.vx * Bz)
      const az = 0
      p.vx += ax * subDt
      p.vy += ay * subDt
      p.vz += az * subDt
      p.x += p.vx * subDt
      p.y += p.vy * subDt
      p.z += p.vz * subDt
    }
    trail.current.push({ x: p.x, y: p.y, z: p.z })
    if (trail.current.length > TRAIL) trail.current.shift()
    draw()
  }, playing)

  const reset = useCallback(() => {
    particleRef.current = { x: 0, y: 0, z: 0, vx: initVx, vy: initVy, vz: initVz }
    trail.current = []
    setPlaying(false); draw()
  }, [initVx, initVy, initVz, draw])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const pr = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = pr.clientWidth * dpr; c.height = pr.clientHeight * dpr; c.style.width = `${pr.clientWidth}px`; c.style.height = `${pr.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Charged Particle in EM Field" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <div className="flex gap-2">
          <button onClick={() => setView('xy')} className={`flex-1 py-1.5 rounded text-xs font-medium ${view === 'xy' ? 'bg-purple-500/20 text-purple-400' : 'bg-navy-800 text-navy-400'}`}>XY View</button>
          <button onClick={() => setView('3d')} className={`flex-1 py-1.5 rounded text-xs font-medium ${view === '3d' ? 'bg-purple-500/20 text-purple-400' : 'bg-navy-800 text-navy-400'}`}>3D View</button>
        </div>
        <Slider label="Bz (magnetic)" value={Bz} min={0.1} max={5} step={0.1} unit="T" onChange={setBz} />
        <Slider label="Ex (electric)" value={Ex} min={-50} max={50} step={5} unit="V/m" onChange={setEx} />
        <Slider label="Ey (electric)" value={Ey} min={-50} max={50} step={5} unit="V/m" onChange={setEy} />
        <Slider label="v₀x" value={initVx} min={0} max={200} step={10} onChange={setInitVx} />
        <Slider label="v₀z (out of plane)" value={initVz} min={0} max={100} step={5} onChange={setInitVz} />
        <Slider label="Charge q" value={charge} min={-3} max={3} step={0.5} unit="e" onChange={setCharge} />
        <PhysicsInfo title="Physics Behind This">
          <p>The Lorentz force law:</p>
          <Eq>{"F = q(E + v × B)"}</Eq>
          <p>In a uniform B field, a charged particle follows a circular orbit (cyclotron motion):</p>
          <Eq>{"r_c = mv⊥/(qB),  ω_c = qB/m"}</Eq>
          <p>With v∥ ≠ 0, the motion becomes helical. Adding E field creates drift:</p>
          <Eq>{"v_drift = (E × B) / B²"}</Eq>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
