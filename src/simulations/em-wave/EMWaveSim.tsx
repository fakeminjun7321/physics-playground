import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#38bdf8'

export default function EMWaveSim() {
  const [wavelength, setWavelength] = useState(200)
  const [amplitude, setAmplitude] = useState(60)
  const [showE, setShowE] = useState(true)
  const [showB, setShowB] = useState(true)
  const [showPoynting, setShowPoynting] = useState(false)
  const [playing, setPlaying] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)

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

    const cy = h / 2
    const t = timeRef.current
    const k = 2 * Math.PI / wavelength
    const omega = k * 150 // c normalized

    // Propagation axis
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(40, cy)
    ctx.lineTo(w - 40, cy)
    ctx.stroke()
    ctx.setLineDash([])

    // E field (vertical, red/orange)
    if (showE) {
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = 40; x < w - 40; x += 2) {
        const val = amplitude * Math.sin(k * x - omega * t)
        const py = cy - val
        if (x === 40) ctx.moveTo(x, py); else ctx.lineTo(x, py)
      }
      ctx.stroke()

      // Field vectors (vertical arrows)
      for (let x = 60; x < w - 40; x += 30) {
        const val = amplitude * Math.sin(k * x - omega * t)
        if (Math.abs(val) < 3) continue
        ctx.strokeStyle = `rgba(249, 115, 22, 0.4)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, cy)
        ctx.lineTo(x, cy - val)
        ctx.stroke()
      }
    }

    // B field (horizontal/depth, shown as perpendicular - blue)
    if (showB) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = 40; x < w - 40; x += 2) {
        const val = amplitude * 0.6 * Math.sin(k * x - omega * t)
        // Show B as depth perspective (angled)
        const px = x + val * 0.3
        const py = cy + val * 0.5
        if (x === 40) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()

      for (let x = 60; x < w - 40; x += 30) {
        const val = amplitude * 0.6 * Math.sin(k * x - omega * t)
        if (Math.abs(val) < 3) continue
        ctx.strokeStyle = `rgba(59, 130, 246, 0.3)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, cy)
        ctx.lineTo(x + val * 0.3, cy + val * 0.5)
        ctx.stroke()
      }
    }

    // Poynting vector (S = E × B, propagation direction)
    if (showPoynting) {
      for (let x = 60; x < w - 40; x += 20) {
        const E = amplitude * Math.sin(k * x - omega * t)
        const B = amplitude * 0.6 * Math.sin(k * x - omega * t)
        const S = E * B / (amplitude * amplitude * 0.6) * 15
        ctx.fillStyle = `rgba(52, 211, 153, ${Math.abs(S) / 15 * 0.8})`
        ctx.beginPath()
        ctx.moveTo(x + S, cy)
        ctx.lineTo(x + S - 4, cy - 3)
        ctx.lineTo(x + S - 4, cy + 3)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Labels
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#f97316'
    ctx.fillText('E (electric)', 12, 24)
    ctx.fillStyle = '#3b82f6'
    ctx.fillText('B (magnetic)', 12, 40)
    if (showPoynting) { ctx.fillStyle = '#34d399'; ctx.fillText('S (Poynting)', 12, 56) }
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.fillText('propagation →', w - 50, cy + 4)

    // Coordinate axes indicator
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 1
    const ax = 50, ay = h - 50
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 30, ay); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 30); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 15, ay + 10); ctx.stroke()
    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'center'
    ctx.fillText('x', ax + 35, ay + 4)
    ctx.fillText('E', ax, ay - 34)
    ctx.fillText('B', ax + 20, ay + 16)

    ctx.restore()
  }, [wavelength, amplitude, showE, showB, showPoynting])

  useAnimation((dt) => { timeRef.current += dt; draw() }, playing)

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="EM Wave Propagation" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={() => { timeRef.current = 0; setPlaying(false); draw() }} />
        <Slider label="Wavelength" value={wavelength} min={60} max={400} step={10} unit="px" onChange={setWavelength} />
        <Slider label="Amplitude" value={amplitude} min={20} max={100} step={5} onChange={setAmplitude} />
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showE} onChange={e => setShowE(e.target.checked)} /> E field</label>
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showB} onChange={e => setShowB(e.target.checked)} /> B field</label>
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showPoynting} onChange={e => setShowPoynting(e.target.checked)} /> Poynting vector S</label>
        <PhysicsInfo title="Physics Behind This">
          <p>Maxwell's equations predict transverse electromagnetic waves where E and B oscillate perpendicular to each other and to propagation:</p>
          <Eq>{"E = E₀ sin(kx - ωt) ŷ"}</Eq>
          <Eq>{"B = B₀ sin(kx - ωt) ẑ"}</Eq>
          <p>The Poynting vector gives energy flow:</p>
          <Eq>{"S = (1/μ₀) E × B"}</Eq>
          <p>In vacuum: c = 1/√(μ₀ε₀) = ω/k, and E₀ = cB₀.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
