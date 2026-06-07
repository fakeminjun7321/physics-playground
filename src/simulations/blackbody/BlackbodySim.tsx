import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'

const COLOR = '#f97316'

const h = 6.626e-34
const c = 3e8
const kB = 1.381e-23

function planck(lambda: number, T: number): number {
  const l = lambda * 1e-9
  return (2 * h * c * c) / Math.pow(l, 5) / (Math.exp(h * c / (l * kB * T)) - 1)
}

function rayleighJeans(lambda: number, T: number): number {
  const l = lambda * 1e-9
  return (2 * c * kB * T) / Math.pow(l, 4)
}

function wien(lambda: number, T: number): number {
  const l = lambda * 1e-9
  return (2 * h * c * c) / Math.pow(l, 5) * Math.exp(-h * c / (l * kB * T))
}

function tempToBodyColor(T: number): string {
  // Approximate blackbody color
  const x = T / 1000
  let r, g, b
  if (x < 6.6) {
    r = 255
    g = Math.min(255, Math.max(0, 99.47 * Math.log(x) - 161.12))
    b = x < 2 ? 0 : Math.min(255, Math.max(0, 138.52 * Math.log(x - 2) - 305.04))
  } else {
    r = Math.min(255, Math.max(0, 329.70 * Math.pow(x - 0.6, -0.133)))
    g = Math.min(255, Math.max(0, 288.12 * Math.pow(x - 0.6, -0.0755)))
    b = 255
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

export default function BlackbodySim() {
  const [temp, setTemp] = useState(5778) // Sun surface temp
  const [showRJ, setShowRJ] = useState(true)
  const [showWien, setShowWien] = useState(true)
  const [logScale, setLogScale] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, hh = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, hh)

    const margin = { left: 70, right: 30, top: 40, bottom: 50 }
    const pw = w - margin.left - margin.right
    const ph = hh - margin.top - margin.bottom

    // Wavelength range 100nm - 3000nm
    const minL = 100, maxL = 3000
    const points = 300
    const planckVals: number[] = []
    const rjVals: number[] = []
    const wienVals: number[] = []

    for (let i = 0; i <= points; i++) {
      const lambda = minL + (i / points) * (maxL - minL)
      planckVals.push(planck(lambda, temp))
      rjVals.push(rayleighJeans(lambda, temp))
      wienVals.push(wien(lambda, temp))
    }

    const maxP = Math.max(...planckVals)
    const maxAll = logScale ? maxP * 10 : Math.max(maxP, showRJ ? Math.min(rjVals[0], maxP * 5) : 0)

    const toX = (i: number) => margin.left + (i / points) * pw
    const toY = (v: number) => {
      if (logScale) {
        const logV = v > 0 ? Math.log10(v) : 0
        const logMax = Math.log10(maxAll)
        const logMin = logMax - 8
        return margin.top + ph - ((logV - logMin) / (logMax - logMin)) * ph
      }
      return margin.top + ph - (v / maxAll) * ph
    }

    // Visible spectrum background
    for (let i = 0; i <= points; i++) {
      const lambda = minL + (i / points) * (maxL - minL)
      if (lambda >= 380 && lambda <= 700) {
        const x = toX(i)
        ctx.fillStyle = wavelengthColor(lambda) + '15'
        ctx.fillRect(x, margin.top, pw / points + 1, ph)
      }
    }

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * ph
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + pw, y); ctx.stroke()
    }

    // Rayleigh-Jeans (classical - ultraviolet catastrophe)
    if (showRJ) {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath()
      let first = true
      for (let i = 0; i <= points; i++) {
        const y = toY(Math.min(rjVals[i], maxAll * 2))
        if (y < margin.top - 20) continue
        if (first) { ctx.moveTo(toX(i), y); first = false } else ctx.lineTo(toX(i), y)
      }
      ctx.stroke(); ctx.setLineDash([])
    }

    // Wien approximation
    if (showWien) {
      ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.beginPath()
      let first = true
      for (let i = 0; i <= points; i++) {
        const y = toY(wienVals[i])
        if (y > margin.top + ph + 5) continue
        if (first) { ctx.moveTo(toX(i), y); first = false } else ctx.lineTo(toX(i), y)
      }
      ctx.stroke(); ctx.setLineDash([])
    }

    // Planck's law (exact)
    ctx.strokeStyle = COLOR; ctx.lineWidth = 2.5; ctx.beginPath()
    for (let i = 0; i <= points; i++) {
      const y = toY(planckVals[i])
      if (i === 0) ctx.moveTo(toX(i), y); else ctx.lineTo(toX(i), y)
    }
    ctx.stroke()

    // Wien peak
    const peakLambda = 2898000 / temp // Wien's displacement law in nm
    if (peakLambda >= minL && peakLambda <= maxL) {
      const peakI = Math.round((peakLambda - minL) / (maxL - minL) * points)
      const px = toX(peakI)
      ctx.setLineDash([3, 3]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(px, margin.top); ctx.lineTo(px, margin.top + ph); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#fbbf24'; ctx.font = '10px monospace'
      ctx.fillText(`λ_max = ${peakLambda.toFixed(0)}nm`, px + 4, margin.top + 14)
    }

    // Axes labels
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Wavelength (nm)', margin.left + pw / 2, hh - 8)
    ctx.save(); ctx.translate(14, margin.top + ph / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillText('Spectral Radiance', 0, 0); ctx.restore()

    // X axis ticks
    ctx.font = '10px monospace'; ctx.textAlign = 'center'
    for (let l = 500; l <= maxL; l += 500) {
      const x = margin.left + ((l - minL) / (maxL - minL)) * pw
      ctx.fillText(`${l}`, x, margin.top + ph + 16)
    }

    // Legend
    ctx.font = '11px sans-serif'; ctx.textAlign = 'left'
    ctx.fillStyle = COLOR; ctx.fillText('Planck', w - 140, 20)
    if (showRJ) { ctx.fillStyle = '#ef4444'; ctx.fillText('Rayleigh-Jeans', w - 140, 36) }
    if (showWien) { ctx.fillStyle = '#818cf8'; ctx.fillText('Wien approx.', w - 140, 52) }

    // Temperature color swatch
    ctx.fillStyle = tempToBodyColor(temp)
    ctx.shadowColor = tempToBodyColor(temp); ctx.shadowBlur = 20
    ctx.beginPath(); ctx.arc(margin.left + pw - 20, margin.top - 15, 12, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    ctx.restore()
  }, [temp, showRJ, showWien, logScale])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Blackbody Radiation" color={COLOR} controls={
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-navy-700" style={{ backgroundColor: tempToBodyColor(temp), boxShadow: `0 0 12px ${tempToBodyColor(temp)}` }} />
          <span className="text-sm font-mono text-navy-200">{temp} K</span>
        </div>
        <Slider label="Temperature" value={temp} min={500} max={15000} step={100} unit="K" onChange={setTemp} />
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showRJ} onChange={e => setShowRJ(e.target.checked)} /> Rayleigh-Jeans (classical)</label>
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showWien} onChange={e => setShowWien(e.target.checked)} /> Wien approximation</label>
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={logScale} onChange={e => setLogScale(e.target.checked)} /> Log scale</label>
        <div className="text-xs text-navy-500 space-y-1">
          <p>Sun: 5778K | Sirius: 9940K</p>
          <p>Wien peak: {(2898000 / temp).toFixed(0)} nm</p>
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>Planck's radiation law (1900) — the birth of quantum mechanics:</p>
          <Eq>{"B(λ,T) = (2hc²/λ⁵) · 1/(e^(hc/λkT) - 1)"}</Eq>
          <p>Classical Rayleigh-Jeans law diverges at short wavelengths (ultraviolet catastrophe):</p>
          <Eq>{"B_RJ = 2ckT/λ⁴"}</Eq>
          <p>Wien's displacement law:</p>
          <Eq>{"λ_max · T = 2898 μm·K"}</Eq>
          <p>Planck's quantization hypothesis (E = nhf) resolved the ultraviolet catastrophe.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}

function wavelengthColor(nm: number): string {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1 }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20 }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65 }
  else if (nm >= 645 && nm <= 700) { r = 1 }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
}
