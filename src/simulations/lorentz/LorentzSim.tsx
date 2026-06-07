import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'

const COLOR = '#22d3ee'

export default function LorentzSim() {
  const [beta, setBeta] = useState(0.6) // v/c
  const [showLightCone, setShowLightCone] = useState(true)
  const [showEvents, setShowEvents] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const gamma = 1 / Math.sqrt(1 - beta * beta)

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2
    const scale = Math.min(w, h) / 6

    // Light cone
    if (showLightCone) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.05)'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + 3 * scale, cy - 3 * scale)
      ctx.lineTo(cx - 3 * scale, cy - 3 * scale)
      ctx.closePath(); ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + 3 * scale, cy + 3 * scale)
      ctx.lineTo(cx - 3 * scale, cy + 3 * scale)
      ctx.closePath(); ctx.fill()

      // Light cone edges
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(cx - 3 * scale, cy + 3 * scale); ctx.lineTo(cx + 3 * scale, cy - 3 * scale); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + 3 * scale, cy + 3 * scale); ctx.lineTo(cx - 3 * scale, cy - 3 * scale); ctx.stroke()
      ctx.setLineDash([])
    }

    // Rest frame axes (x, ct)
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx - 3 * scale, cy); ctx.lineTo(cx + 3 * scale, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy + 3 * scale); ctx.lineTo(cx, cy - 3 * scale); ctx.stroke()

    ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif'
    ctx.fillText('x', cx + 3 * scale + 5, cy + 4)
    ctx.fillText('ct', cx + 5, cy - 3 * scale + 5)

    // Grid lines (rest frame)
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 0.5
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue
      ctx.beginPath(); ctx.moveTo(cx + i * scale, cy - 3 * scale); ctx.lineTo(cx + i * scale, cy + 3 * scale); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - 3 * scale, cy - i * scale); ctx.lineTo(cx + 3 * scale, cy - i * scale); ctx.stroke()
    }

    // Moving frame axes (x', ct')
    // ct' axis: slope = 1/beta (tilted toward light cone)
    // x' axis: slope = beta
    const angle_ct = Math.atan(beta) // angle of ct' axis from vertical
    const angle_x = Math.atan(beta)  // angle of x' axis from horizontal

    ctx.strokeStyle = COLOR; ctx.lineWidth = 2
    // ct' axis
    ctx.beginPath()
    ctx.moveTo(cx - 3 * scale * Math.sin(angle_ct), cy + 3 * scale * Math.cos(angle_ct))
    ctx.lineTo(cx + 3 * scale * Math.sin(angle_ct), cy - 3 * scale * Math.cos(angle_ct))
    ctx.stroke()
    // x' axis
    ctx.beginPath()
    ctx.moveTo(cx - 3 * scale * Math.cos(angle_x), cy + 3 * scale * Math.sin(angle_x))
    ctx.lineTo(cx + 3 * scale * Math.cos(angle_x), cy - 3 * scale * Math.sin(angle_x))
    ctx.stroke()

    ctx.fillStyle = COLOR; ctx.font = '12px sans-serif'
    const xpEnd = [cx + 3 * scale * Math.cos(angle_x), cy - 3 * scale * Math.sin(angle_x)]
    const ctpEnd = [cx + 3 * scale * Math.sin(angle_ct), cy - 3 * scale * Math.cos(angle_ct)]
    ctx.fillText("x'", xpEnd[0] + 5, xpEnd[1] + 4)
    ctx.fillText("ct'", ctpEnd[0] + 5, ctpEnd[1] + 5)

    // Simultaneity lines for moving frame
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'; ctx.lineWidth = 0.5
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue
      // Lines of constant ct' (parallel to x' axis)
      const baseX = cx + i * scale * Math.sin(angle_ct)
      const baseY = cy - i * scale * Math.cos(angle_ct)
      ctx.beginPath()
      ctx.moveTo(baseX - 2 * scale * Math.cos(angle_x), baseY + 2 * scale * Math.sin(angle_x))
      ctx.lineTo(baseX + 2 * scale * Math.cos(angle_x), baseY - 2 * scale * Math.sin(angle_x))
      ctx.stroke()
    }

    // Sample events
    if (showEvents) {
      const events = [
        { x: 1, ct: 1.5, label: 'A', color: '#f472b6' },
        { x: -0.5, ct: 2, label: 'B', color: '#34d399' },
        { x: 2, ct: 0.5, label: 'C (spacelike)', color: '#fb923c' },
      ]

      for (const ev of events) {
        const sx = cx + ev.x * scale
        const sy = cy - ev.ct * scale

        // Transform to S' frame
        const xp = gamma * (ev.x - beta * ev.ct)
        const ctp = gamma * (ev.ct - beta * ev.x)

        ctx.fillStyle = ev.color
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill()

        ctx.font = '11px monospace'; ctx.textAlign = 'left'
        ctx.fillText(`${ev.label}`, sx + 8, sy - 8)
        ctx.font = '9px monospace'; ctx.fillStyle = '#94a3b8'
        ctx.fillText(`S: (${ev.x}, ${ev.ct})`, sx + 8, sy + 4)
        ctx.fillStyle = COLOR
        ctx.fillText(`S': (${xp.toFixed(2)}, ${ctp.toFixed(2)})`, sx + 8, sy + 16)
      }
    }

    // Info
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`β = v/c = ${beta.toFixed(2)}`, 12, 24)
    ctx.fillText(`γ = ${gamma.toFixed(3)}`, 12, 40)
    ctx.fillText(`v = ${(beta * 3e8 / 1e6).toFixed(0)} km/s`, 12, 56)

    ctx.restore()
  }, [beta, gamma, showLightCone, showEvents])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Lorentz Transformation" color={COLOR} controls={
      <div className="space-y-4">
        <Slider label="β = v/c" value={beta} min={0} max={0.99} step={0.01} onChange={setBeta} />
        <div className="rounded-lg bg-navy-950 border border-navy-800 p-3 space-y-1 text-xs font-mono">
          <div className="flex justify-between"><span className="text-navy-400">γ (Lorentz factor)</span><span>{gamma.toFixed(4)}</span></div>
          <div className="flex justify-between"><span className="text-navy-400">Time dilation</span><span>{gamma.toFixed(3)}×</span></div>
          <div className="flex justify-between"><span className="text-navy-400">Length contraction</span><span>{(1 / gamma).toFixed(3)}×</span></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showLightCone} onChange={e => setShowLightCone(e.target.checked)} /> Light cone</label>
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)} /> Sample events</label>
        <PhysicsInfo title="Physics Behind This">
          <p>The Lorentz transformation connects spacetime coordinates between inertial frames:</p>
          <Eq>{"x' = γ(x - βct)"}</Eq>
          <Eq>{"ct' = γ(ct - βx)"}</Eq>
          <p>Where γ = 1/√(1-β²) and β = v/c.</p>
          <p>The Minkowski diagram shows how simultaneity is relative: events simultaneous in S (horizontal line) are NOT simultaneous in S' (tilted x' axis).</p>
          <p>The invariant spacetime interval: s² = (ct)² - x² is the same in all frames.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
