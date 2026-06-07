import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'

const COLOR = '#818cf8'

// Radial wave functions (simplified, in atomic units a₀=1)
function radial(n: number, l: number, r: number): number {
  const rho = 2 * r / n
  let R = 0
  if (n === 1 && l === 0) R = 2 * Math.exp(-rho / 2)
  else if (n === 2 && l === 0) R = (1 / (2 * Math.sqrt(2))) * (2 - rho) * Math.exp(-rho / 2)
  else if (n === 2 && l === 1) R = (1 / (2 * Math.sqrt(6))) * rho * Math.exp(-rho / 2)
  else if (n === 3 && l === 0) R = (2 / (81 * Math.sqrt(3))) * (27 - 18 * rho + 2 * rho * rho) * Math.exp(-rho / 2)
  else if (n === 3 && l === 1) R = (8 / (27 * Math.sqrt(6))) * (6 - rho) * rho * Math.exp(-rho / 2)
  else if (n === 3 && l === 2) R = (4 / (81 * Math.sqrt(30))) * rho * rho * Math.exp(-rho / 2)
  else if (n === 4 && l === 0) R = (1 / 96) * (192 - 144 * rho + 24 * Math.pow(rho, 2) - Math.pow(rho, 3)) * Math.exp(-rho / 2)
  else if (n === 4 && l === 1) R = (1 / (32 * Math.sqrt(15))) * (80 - 20 * rho + Math.pow(rho, 2)) * rho * Math.exp(-rho / 2)
  else if (n === 4 && l === 2) R = (1 / (96 * Math.sqrt(5))) * (12 - rho) * Math.pow(rho, 2) * Math.exp(-rho / 2)
  else if (n === 4 && l === 3) R = (1 / (96 * Math.sqrt(35))) * Math.pow(rho, 3) * Math.exp(-rho / 2)
  return R
}

// Spherical harmonics |Y_l^m|² (simplified for m=0)
function sphericalHarmonic(l: number, m: number, theta: number): number {
  const cosT = Math.cos(theta)
  if (l === 0) return 1 / (4 * Math.PI)
  if (l === 1 && Math.abs(m) === 0) return (3 / (4 * Math.PI)) * cosT * cosT
  if (l === 1 && Math.abs(m) === 1) return (3 / (8 * Math.PI)) * Math.pow(Math.sin(theta), 2)
  if (l === 2 && m === 0) return (5 / (16 * Math.PI)) * Math.pow(3 * cosT * cosT - 1, 2)
  if (l === 2 && Math.abs(m) === 1) return (15 / (8 * Math.PI)) * Math.pow(Math.sin(theta), 2) * cosT * cosT
  if (l === 2 && Math.abs(m) === 2) return (15 / (32 * Math.PI)) * Math.pow(Math.sin(theta), 4)
  if (l === 3 && m === 0) return (7 / (16 * Math.PI)) * Math.pow(5 * Math.pow(cosT, 3) - 3 * cosT, 2)
  return 1 / (4 * Math.PI)
}

export default function HydrogenOrbitalSim() {
  const [n, setN] = useState(2)
  const [l, setL] = useState(1)
  const [m, setM] = useState(0)
  const [showRadial, setShowRadial] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)

  // Ensure quantum number constraints
  const validL = Math.min(l, n - 1)
  const validM = Math.min(Math.abs(m), validL) * Math.sign(m)

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2
    const maxR = n * n * 3 // scale radius based on n
    const pixScale = Math.min(w, h) / 2.5

    // Render probability density as a 2D cross-section (xz plane)
    const step = 3
    const imgData = ctx.createImageData(Math.ceil(w), Math.ceil(h))
    const data = imgData.data

    let maxProb = 0
    const probGrid: number[] = []

    for (let py = 0; py < h; py += step) {
      for (let px = 0; px < w; px += step) {
        const x = (px - cx) / pixScale * maxR
        const z = (cy - py) / pixScale * maxR
        const r = Math.sqrt(x * x + z * z)
        const theta = Math.atan2(Math.sqrt(x * x), z)

        if (r < 0.1) { probGrid.push(0); continue }

        const R = radial(n, validL, r)
        const Y = sphericalHarmonic(validL, Math.abs(validM), theta)
        const prob = R * R * Y
        probGrid.push(prob)
        if (prob > maxProb) maxProb = prob
      }
    }

    let idx = 0
    for (let py = 0; py < h; py += step) {
      for (let px = 0; px < w; px += step) {
        const prob = probGrid[idx++]
        const intensity = maxProb > 0 ? Math.pow(prob / maxProb, 0.4) : 0
        const r = Math.round(100 * intensity)
        const g = Math.round(120 * intensity + 80 * intensity * intensity)
        const b = Math.round(248 * intensity)

        for (let dy = 0; dy < step && py + dy < h; dy++) {
          for (let dx = 0; dx < step && px + dx < h; dx++) {
            const i = ((py + dy) * Math.ceil(w) + (px + dx)) * 4
            data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)

    // Labels
    ctx.fillStyle = '#f1f5f9'; ctx.font = '14px monospace'
    ctx.fillText(`|${n}, ${validL}, ${validM}⟩`, 12, 24)
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'
    ctx.fillText(`n=${n}  l=${validL}  m=${validM}`, 12, 42)

    const orbitalNames: Record<number, string> = { 0: 's', 1: 'p', 2: 'd', 3: 'f' }
    ctx.fillText(`Orbital: ${n}${orbitalNames[validL] || '?'}`, 12, 58)
    ctx.fillText(`E = -13.6/${n}² = ${(-13.6 / (n * n)).toFixed(2)} eV`, 12, 74)

    // Cross-section label
    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('xz cross-section', w / 2, h - 8)

    ctx.restore()
  }, [n, validL, validM])

  const drawGraph = useCallback(() => {
    const canvas = graphRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    if (!showRadial) { ctx.restore(); return }

    const margin = 8
    const maxR = n * n * 4
    const points = 200
    let maxVal = 0

    // r²|R(r)|² (radial probability density)
    const vals: number[] = []
    for (let i = 0; i <= points; i++) {
      const r = (i / points) * maxR
      const R = radial(n, validL, r)
      const v = r * r * R * R
      vals.push(v)
      if (v > maxVal) maxVal = v
    }

    if (maxVal === 0) { ctx.restore(); return }

    ctx.strokeStyle = COLOR; ctx.lineWidth = 1.5; ctx.beginPath()
    for (let i = 0; i <= points; i++) {
      const x = margin + (i / points) * (w - margin * 2)
      const y = h - margin - (vals[i] / maxVal) * (h - margin * 2 - 12)
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.fillStyle = 'rgba(129, 140, 248, 0.1)'; ctx.beginPath()
    ctx.moveTo(margin, h - margin)
    for (let i = 0; i <= points; i++) {
      const x = margin + (i / points) * (w - margin * 2)
      const y = h - margin - (vals[i] / maxVal) * (h - margin * 2 - 12)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(margin + (w - margin * 2), h - margin); ctx.closePath(); ctx.fill()

    ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'
    ctx.fillText('r²|R(r)|²', margin, 12)

    ctx.restore()
  }, [n, validL, showRadial])

  useEffect(() => { draw(); drawGraph() }, [draw, drawGraph])

  useEffect(() => {
    const setup = (c: HTMLCanvasElement | null) => { if (!c) return; const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px` }
    setup(canvasRef.current); setup(graphRef.current); draw(); drawGraph()
    const onResize = () => { setup(canvasRef.current); setup(graphRef.current); draw(); drawGraph() }
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize)
  }, [draw, drawGraph])

  return (
    <SimulationLayout title="Hydrogen Atom Orbitals" color={COLOR} controls={
      <div className="space-y-4">
        <Slider label="n (principal)" value={n} min={1} max={4} step={1} onChange={v => { setN(v); setL(Math.min(l, v - 1)); setM(Math.min(Math.abs(m), Math.min(l, v - 1)) * Math.sign(m)) }} />
        <Slider label="l (angular)" value={l} min={0} max={n - 1} step={1} onChange={v => { setL(v); setM(Math.min(Math.abs(m), v) * Math.sign(m)) }} />
        <Slider label="m (magnetic)" value={m} min={-validL} max={validL} step={1} onChange={setM} />
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showRadial} onChange={e => setShowRadial(e.target.checked)} /> Show radial distribution</label>
        <div className="rounded-lg overflow-hidden bg-navy-950 border border-navy-800" style={{ height: 120 }}>
          <canvas ref={graphRef} className="w-full h-full" />
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>The hydrogen wave function:</p>
          <Eq>{"ψ_nlm(r,θ,φ) = R_nl(r) · Y_l^m(θ,φ)"}</Eq>
          <p>Quantum numbers: n (energy), l (angular momentum), m (magnetic).</p>
          <Eq>{"E_n = -13.6 eV / n²"}</Eq>
          <p>Selection rules: l = 0,1,...,n-1 and m = -l,...,+l.</p>
          <p>The probability density |ψ|² shows where the electron is most likely found. The radial distribution r²|R|² gives the probability at radius r.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
