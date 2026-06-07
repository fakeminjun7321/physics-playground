import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { type Charge, electricField, traceFieldLine, potential } from './physics'

const COLOR = '#34d399'

export default function ElectricFieldSim() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [chargeSign, setChargeSign] = useState<1 | -1>(1)
  const [chargeMag, setChargeMag] = useState(5)
  const [lineDensity, setLineDensity] = useState(12)
  const [showVectorField, setShowVectorField] = useState(false)
  const [showEquipotential, setShowEquipotential] = useState(false)
  const [mouseField, setMouseField] = useState<{ ex: number; ey: number; mag: number } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null)
  const nextIdRef = useRef(1)

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

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
    ctx.fillStyle = '#020617'
    ctx.fillRect(0, 0, w, h)

    if (charges.length === 0) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Click anywhere to place charges', w / 2, h / 2)
      ctx.restore()
      return
    }

    // Vector field
    if (showVectorField) {
      const gridStep = 35
      for (let x = gridStep; x < w; x += gridStep) {
        for (let y = gridStep; y < h; y += gridStep) {
          const { ex, ey } = electricField(x, y, charges)
          const mag = Math.sqrt(ex * ex + ey * ey)
          if (mag < 1e-3) continue
          const len = Math.min(15, Math.log10(mag + 1) * 5)
          const nx = ex / mag
          const ny = ey / mag
          ctx.strokeStyle = `rgba(148, 163, 184, ${Math.min(0.6, mag * 0.00001)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x - nx * len / 2, y - ny * len / 2)
          ctx.lineTo(x + nx * len / 2, y + ny * len / 2)
          ctx.stroke()
          // Arrow tip
          ctx.beginPath()
          ctx.moveTo(x + nx * len / 2, y + ny * len / 2)
          ctx.lineTo(
            x + nx * len / 2 - 3 * nx + 2 * ny,
            y + ny * len / 2 - 3 * ny - 2 * nx,
          )
          ctx.stroke()
        }
      }
    }

    // Equipotential lines
    if (showEquipotential) {
      const levels = [-5e4, -2e4, -1e4, -5e3, -2e3, 2e3, 5e3, 1e4, 2e4, 5e4]
      const step = 4
      for (let x = 0; x < w; x += step) {
        for (let y = 0; y < h; y += step) {
          const v = potential(x, y, charges)
          for (const level of levels) {
            const vRight = x + step < w ? potential(x + step, y, charges) : v
            const vDown = y + step < h ? potential(x, y + step, charges) : v
            if ((v - level) * (vRight - level) < 0 || (v - level) * (vDown - level) < 0) {
              ctx.fillStyle = level > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'
              ctx.fillRect(x, y, 2, 2)
            }
          }
        }
      }
    }

    // Field lines
    for (const charge of charges) {
      if (charge.q <= 0) continue // lines emerge from positive charges
      const n = lineDensity
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2
        const startX = charge.x + Math.cos(angle) * 12
        const startY = charge.y + Math.sin(angle) * 12
        const points = traceFieldLine(startX, startY, charges, w, h, 1)
        if (points.length < 2) continue

        ctx.strokeStyle = `rgba(52, 211, 153, 0.5)`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let j = 1; j < points.length; j++) {
          ctx.lineTo(points[j].x, points[j].y)
        }
        ctx.stroke()

        // Arrow in the middle
        const mid = Math.floor(points.length / 3)
        if (mid > 0 && mid < points.length - 1) {
          const p = points[mid]
          const pn = points[mid + 1]
          const dx = pn.x - p.x
          const dy = pn.y - p.y
          const m = Math.sqrt(dx * dx + dy * dy)
          if (m > 0) {
            const nx = dx / m
            const ny = dy / m
            ctx.fillStyle = 'rgba(52, 211, 153, 0.6)'
            ctx.beginPath()
            ctx.moveTo(p.x + nx * 5, p.y + ny * 5)
            ctx.lineTo(p.x - nx * 3 + ny * 3, p.y - ny * 3 - nx * 3)
            ctx.lineTo(p.x - nx * 3 - ny * 3, p.y - ny * 3 + nx * 3)
            ctx.closePath()
            ctx.fill()
          }
        }
      }
    }

    // If no positive charges, draw lines from negative charges in reverse
    if (!charges.some((c) => c.q > 0)) {
      for (const charge of charges) {
        const n = lineDensity
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2
          const startX = charge.x + Math.cos(angle) * 12
          const startY = charge.y + Math.sin(angle) * 12
          const points = traceFieldLine(startX, startY, charges, w, h, -1)
          if (points.length < 2) continue
          ctx.strokeStyle = `rgba(52, 211, 153, 0.5)`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y)
          ctx.stroke()
        }
      }
    }

    // Draw charges
    for (const charge of charges) {
      const positive = charge.q > 0
      const radius = 14 + Math.abs(charge.q) * 0.8

      // Glow
      ctx.shadowColor = positive ? '#ef4444' : '#3b82f6'
      ctx.shadowBlur = 15

      ctx.fillStyle = positive ? '#ef4444' : '#3b82f6'
      ctx.beginPath()
      ctx.arc(charge.x, charge.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // + or - symbol
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(charge.x - 6, charge.y)
      ctx.lineTo(charge.x + 6, charge.y)
      ctx.stroke()
      if (positive) {
        ctx.beginPath()
        ctx.moveTo(charge.x, charge.y - 6)
        ctx.lineTo(charge.x, charge.y + 6)
        ctx.stroke()
      }
    }

    // Mouse field info
    if (mouseField) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`|E| = ${mouseField.mag.toExponential(2)} N/C`, 12, 24)
    }

    ctx.restore()
  }, [charges, lineDensity, showVectorField, showEquipotential, mouseField])

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setup = () => {
      const parent = canvas.parentElement!
      const dpr = window.devicePixelRatio || 1
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
      draw()
    }
    setup()
    window.addEventListener('resize', setup)
    return () => window.removeEventListener('resize', setup)
  }, [draw])

  useEffect(() => { draw() }, [draw])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e)
    // Check if clicking on existing charge
    for (const charge of charges) {
      const dx = x - charge.x
      const dy = y - charge.y
      if (dx * dx + dy * dy < 400) {
        dragRef.current = { id: charge.id, offsetX: dx, offsetY: dy }
        return
      }
    }
    // Place new charge
    const newCharge: Charge = {
      id: nextIdRef.current++,
      x,
      y,
      q: chargeSign * chargeMag,
    }
    setCharges((prev) => [...prev, newCharge])
  }, [charges, chargeSign, chargeMag, getCanvasCoords])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e)
    if (dragRef.current) {
      const { id, offsetX, offsetY } = dragRef.current
      setCharges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, x: x - offsetX, y: y - offsetY } : c)),
      )
    } else if (charges.length > 0) {
      const { ex, ey } = electricField(x, y, charges)
      setMouseField({ ex, ey, mag: Math.sqrt(ex * ex + ey * ey) })
    }
  }, [charges, getCanvasCoords])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <SimulationLayout title="Electric Field" color={COLOR} controls={
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setChargeSign(1)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              chargeSign > 0 ? 'bg-red-500/20 text-red-400' : 'bg-navy-800 text-navy-400'
            }`}
          >
            + Positive
          </button>
          <button
            onClick={() => setChargeSign(-1)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              chargeSign < 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-navy-800 text-navy-400'
            }`}
          >
            − Negative
          </button>
        </div>

        <Slider label="Charge Magnitude" value={chargeMag} min={1} max={10} step={1} unit="μC" onChange={setChargeMag} />
        <Slider label="Field Line Density" value={lineDensity} min={4} max={24} step={2} onChange={setLineDensity} />

        <label className="flex items-center gap-2 text-sm text-navy-400">
          <input
            type="checkbox"
            checked={showVectorField}
            onChange={(e) => setShowVectorField(e.target.checked)}
          />
          Vector Field Arrows
        </label>

        <label className="flex items-center gap-2 text-sm text-navy-400">
          <input
            type="checkbox"
            checked={showEquipotential}
            onChange={(e) => setShowEquipotential(e.target.checked)}
          />
          Equipotential Lines
        </label>

        <button
          onClick={() => setCharges([])}
          className="w-full py-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors text-sm"
        >
          Clear All Charges
        </button>

        {charges.length > 0 && (
          <div className="space-y-1 text-xs text-navy-400">
            <span className="text-navy-500">Placed charges:</span>
            {charges.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span style={{ color: c.q > 0 ? '#ef4444' : '#3b82f6' }}>
                  {c.q > 0 ? '+' : ''}{c.q} μC
                </span>
                <span className="font-mono">({Math.round(c.x)}, {Math.round(c.y)})</span>
              </div>
            ))}
          </div>
        )}
        <PhysicsInfo title="Physics Behind This">
          <p>Coulomb's law gives the electric field from each point charge:</p>
          <Eq>{"E = k·Q / r²"}</Eq>
          <p>Where k = 8.99 × 10⁹ N·m²/C² (Coulomb constant).</p>
          <p>The total field at any point is the vector sum of contributions from all charges (superposition principle).</p>
          <Eq>{"E_total = Σ (k·Qᵢ/rᵢ²)·r̂ᵢ"}</Eq>
          <p>Electric potential (scalar):</p>
          <Eq>{"V = k·Q / r"}</Eq>
          <p>Field lines emerge from + charges and terminate on - charges. Equipotential lines are perpendicular to field lines.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </SimulationLayout>
  )
}
