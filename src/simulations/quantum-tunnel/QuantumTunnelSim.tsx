import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#22d3ee'
const N = 600 // spatial grid points

export default function QuantumTunnelSim() {
  const [barrierHeight, setBarrierHeight] = useState(1.2)
  const [barrierWidth, setBarrierWidth] = useState(30)
  const [energy, setEnergy] = useState(0.8)
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const psiReal = useRef(new Float64Array(N))
  const psiImag = useRef(new Float64Array(N))
  const potential = useRef(new Float64Array(N))
  const timeRef = useRef(0)

  const initWavepacket = useCallback(() => {
    const re = psiReal.current
    const im = psiImag.current
    const V = potential.current
    const dx = 1

    // Barrier
    const barrierStart = Math.floor(N * 0.5)
    const barrierEnd = barrierStart + barrierWidth
    for (let i = 0; i < N; i++) {
      V[i] = (i >= barrierStart && i < barrierEnd) ? barrierHeight : 0
    }

    // Gaussian wave packet: ψ = exp(-((x-x0)/σ)²) * exp(ikx)
    const x0 = N * 0.25
    const sigma = 30
    const k = Math.sqrt(2 * energy) * 3

    for (let i = 0; i < N; i++) {
      const x = i * dx
      const envelope = Math.exp(-Math.pow((x - x0) / sigma, 2))
      re[i] = envelope * Math.cos(k * x)
      im[i] = envelope * Math.sin(k * x)
    }

    // Normalize
    let norm = 0
    for (let i = 0; i < N; i++) norm += re[i] * re[i] + im[i] * im[i]
    norm = Math.sqrt(norm)
    for (let i = 0; i < N; i++) { re[i] /= norm; im[i] /= norm }

    timeRef.current = 0
  }, [barrierHeight, barrierWidth, energy])

  useEffect(() => { initWavepacket() }, [initWavepacket])

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const re = psiReal.current
    const im = psiImag.current
    const V = potential.current
    const margin = { left: 40, right: 20, top: 40, bottom: 40 }
    const pw = w - margin.left - margin.right
    const ph = h - margin.top - margin.bottom
    const cy = margin.top + ph * 0.6
    const scale = ph * 2.5

    // Potential barrier
    for (let i = 0; i < N; i++) {
      if (V[i] > 0) {
        const x = margin.left + (i / N) * pw
        const barH = V[i] / barrierHeight * ph * 0.3
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
        ctx.fillRect(x, cy - barH, pw / N + 1, barH * 2)
      }
    }
    // Barrier outline
    const bs = Math.floor(N * 0.5)
    const be = bs + barrierWidth
    const bx1 = margin.left + (bs / N) * pw
    const bx2 = margin.left + (be / N) * pw
    const bh = ph * 0.3
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bx1, cy); ctx.lineTo(bx1, cy - bh)
    ctx.lineTo(bx2, cy - bh); ctx.lineTo(bx2, cy)
    ctx.stroke()
    ctx.fillStyle = '#ef4444'; ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`V₀ = ${barrierHeight.toFixed(1)}`, (bx1 + bx2) / 2, cy - bh - 8)

    // Probability density |ψ|²
    ctx.fillStyle = 'rgba(34, 211, 238, 0.15)'
    ctx.beginPath()
    ctx.moveTo(margin.left, cy)
    for (let i = 0; i < N; i++) {
      const prob = (re[i] * re[i] + im[i] * im[i]) * scale
      const x = margin.left + (i / N) * pw
      ctx.lineTo(x, cy - prob)
    }
    ctx.lineTo(margin.left + pw, cy)
    ctx.closePath(); ctx.fill()

    // |ψ|² outline
    ctx.strokeStyle = COLOR; ctx.lineWidth = 2; ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const prob = (re[i] * re[i] + im[i] * im[i]) * scale
      const x = margin.left + (i / N) * pw
      if (i === 0) ctx.moveTo(x, cy - prob); else ctx.lineTo(x, cy - prob)
    }
    ctx.stroke()

    // Real part (fainter)
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.5)'; ctx.lineWidth = 1; ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const x = margin.left + (i / N) * pw
      const y = cy - re[i] * scale * 0.7
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Zero line
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(margin.left, cy); ctx.lineTo(margin.left + pw, cy); ctx.stroke()

    // Energy level
    const eLine = cy - (energy / barrierHeight) * bh
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(margin.left, eLine); ctx.lineTo(margin.left + pw, eLine); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#fbbf24'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`E = ${energy.toFixed(1)}`, margin.left + 4, eLine - 6)

    // Transmission coefficient estimate
    const kappa = Math.sqrt(2 * Math.abs(barrierHeight - energy)) * 3
    const T = energy < barrierHeight
      ? Math.exp(-2 * kappa * barrierWidth)
      : 1
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`T ≈ ${T < 0.001 ? T.toExponential(2) : T.toFixed(4)}`, 12, 24)
    ctx.fillText(`t = ${timeRef.current.toFixed(1)}`, 12, 40)

    // Legend
    ctx.font = '10px sans-serif'
    ctx.fillStyle = COLOR; ctx.fillText('|ψ|²', w - 80, 20)
    ctx.fillStyle = '#818cf8'; ctx.fillText('Re(ψ)', w - 80, 34)

    ctx.restore()
  }, [barrierHeight, barrierWidth, energy])

  useAnimation(() => {
    const re = psiReal.current
    const im = psiImag.current
    const V = potential.current

    // Split-step method for Schrödinger equation
    const dt = 0.5
    const dx = 1
    const steps = 4

    for (let s = 0; s < steps; s++) {
      // Half-step potential
      for (let i = 0; i < N; i++) {
        const phase = -V[i] * dt / 2
        const cosP = Math.cos(phase), sinP = Math.sin(phase)
        const r = re[i], im2 = im[i]
        re[i] = r * cosP - im2 * sinP
        im[i] = r * sinP + im2 * cosP
      }

      // Kinetic step (finite difference Laplacian)
      const reNew = new Float64Array(N)
      const imNew = new Float64Array(N)
      const coeff = dt / (2 * dx * dx)
      for (let i = 1; i < N - 1; i++) {
        const lapR = re[i + 1] - 2 * re[i] + re[i - 1]
        const lapI = im[i + 1] - 2 * im[i] + im[i - 1]
        reNew[i] = re[i] + coeff * lapI
        imNew[i] = im[i] - coeff * lapR
      }
      for (let i = 1; i < N - 1; i++) { re[i] = reNew[i]; im[i] = imNew[i] }

      // Half-step potential
      for (let i = 0; i < N; i++) {
        const phase = -V[i] * dt / 2
        const cosP = Math.cos(phase), sinP = Math.sin(phase)
        const r = re[i], im2 = im[i]
        re[i] = r * cosP - im2 * sinP
        im[i] = r * sinP + im2 * cosP
      }
    }

    timeRef.current += 0.05
    draw()
  }, playing)

  const reset = useCallback(() => { initWavepacket(); setPlaying(false); draw() }, [initWavepacket, draw])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Quantum Tunneling" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <Slider label="Barrier Height V₀" value={barrierHeight} min={0.3} max={3} step={0.1} onChange={setBarrierHeight} />
        <Slider label="Barrier Width" value={barrierWidth} min={5} max={80} step={1} unit="a.u." onChange={setBarrierWidth} />
        <Slider label="Particle Energy E" value={energy} min={0.1} max={2.5} step={0.1} onChange={setEnergy} />
        <PhysicsInfo title="Physics Behind This">
          <p>Time-dependent Schrödinger equation:</p>
          <Eq>{"iℏ ∂ψ/∂t = -ℏ²/(2m) ∂²ψ/∂x² + V(x)ψ"}</Eq>
          <p>When E &lt; V₀, classically the particle is reflected. Quantum mechanically, there is a nonzero transmission probability:</p>
          <Eq>{"T ≈ e^(-2κd),  κ = √(2m(V₀-E))/ℏ"}</Eq>
          <p>The wave function decays exponentially inside the barrier but emerges on the other side. This is the basis of tunnel diodes, STM microscopy, and alpha decay.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
