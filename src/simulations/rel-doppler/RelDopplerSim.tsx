import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#f472b6'

function freqToColor(ratio: number): string {
  // ratio < 1 = redshift, ratio > 1 = blueshift
  if (ratio < 0.8) return '#ef4444'
  if (ratio < 0.95) return `rgb(${255}, ${Math.round((ratio - 0.8) / 0.15 * 165)}, 0)`
  if (ratio < 1.05) return '#f8fafc'
  if (ratio < 1.2) return `rgb(0, ${Math.round((1.2 - ratio) / 0.15 * 165)}, 255)`
  return '#3b82f6'
}

export default function RelDopplerSim() {
  const [beta, setBeta] = useState(0.3)
  const [_sourceFreq, _setSourceFreq] = useState(550) // nm (as wavelength for visual)
  const [playing, setPlaying] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const waveFronts = useRef<{ x: number; y: number; t: number }[]>([])

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const t = timeRef.current
    const sourceX = w / 2 + beta * t * 80
    const cy = h / 2

    // Wave fronts
    for (const wf of waveFronts.current) {
      const age = t - wf.t
      const radius = age * 80 // c = 80 px/s
      if (radius < 0 || radius > w) continue
      const alpha = Math.max(0, 1 - age / 5)
      ctx.strokeStyle = `rgba(248, 250, 252, ${alpha * 0.3})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(wf.x, wf.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Source
    ctx.shadowColor = COLOR; ctx.shadowBlur = 15
    ctx.fillStyle = COLOR
    ctx.beginPath(); ctx.arc(sourceX, cy, 10, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    // Velocity arrow
    if (beta > 0.01) {
      ctx.strokeStyle = COLOR; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(sourceX + 15, cy); ctx.lineTo(sourceX + 50, cy); ctx.stroke()
      ctx.fillStyle = COLOR
      ctx.beginPath(); ctx.moveTo(sourceX + 55, cy); ctx.lineTo(sourceX + 45, cy - 5); ctx.lineTo(sourceX + 45, cy + 5); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'
      ctx.fillText(`v = ${beta.toFixed(2)}c`, sourceX + 15, cy - 12)
    }

    // Observer positions
    const obsLeft = 50, obsRight = w - 50

    // Approaching observer (right)
    const ratioApproach = Math.sqrt((1 + beta) / (1 - beta))
    ctx.fillStyle = freqToColor(ratioApproach)
    ctx.beginPath(); ctx.arc(obsRight, cy, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Approaching', obsRight, cy - 20)
    ctx.fillStyle = freqToColor(ratioApproach); ctx.font = '11px monospace'
    ctx.fillText(`f'/f = ${ratioApproach.toFixed(3)}`, obsRight, cy + 25)
    ctx.fillText('blueshift', obsRight, cy + 40)

    // Receding observer (left)
    const ratioRecede = Math.sqrt((1 - beta) / (1 + beta))
    ctx.fillStyle = freqToColor(ratioRecede)
    ctx.beginPath(); ctx.arc(obsLeft, cy, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Receding', obsLeft, cy - 20)
    ctx.fillStyle = freqToColor(ratioRecede); ctx.font = '11px monospace'
    ctx.fillText(`f'/f = ${ratioRecede.toFixed(3)}`, obsLeft, cy + 25)
    ctx.fillText('redshift', obsLeft, cy + 40)

    // Transverse (top)
    const ratioTransverse = 1 / (Math.sqrt(1 - beta * beta))
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(`Transverse Doppler: f'/f = ${(1 / ratioTransverse).toFixed(4)} (purely relativistic)`, w / 2, h - 20)

    ctx.restore()
  }, [beta])

  useAnimation((dt) => {
    timeRef.current += dt
    // Emit wave fronts periodically
    const emitInterval = 0.15
    const lastEmit = waveFronts.current.length > 0 ? waveFronts.current[waveFronts.current.length - 1].t : -1
    if (timeRef.current - lastEmit > emitInterval) {
      const sourceX = canvasRef.current!.width / (window.devicePixelRatio || 1) / 2 + beta * timeRef.current * 80
      waveFronts.current.push({ x: sourceX, y: canvasRef.current!.height / (window.devicePixelRatio || 1) / 2, t: timeRef.current })
    }
    // Remove old fronts
    waveFronts.current = waveFronts.current.filter(wf => timeRef.current - wf.t < 6)
    draw()
  }, playing)

  const reset = useCallback(() => { timeRef.current = 0; waveFronts.current = []; setPlaying(false); draw() }, [draw])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Relativistic Doppler Effect" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={reset} />
        <Slider label="β = v/c" value={beta} min={0} max={0.95} step={0.01} onChange={setBeta} />
        <div className="rounded-lg bg-navy-950 border border-navy-800 p-3 space-y-1 text-xs font-mono">
          <div className="flex justify-between"><span className="text-navy-400">Approaching</span><span style={{ color: freqToColor(Math.sqrt((1 + beta) / (1 - beta))) }}>×{Math.sqrt((1 + beta) / (1 - beta)).toFixed(3)}</span></div>
          <div className="flex justify-between"><span className="text-navy-400">Receding</span><span style={{ color: freqToColor(Math.sqrt((1 - beta) / (1 + beta))) }}>×{Math.sqrt((1 - beta) / (1 + beta)).toFixed(3)}</span></div>
          <div className="flex justify-between"><span className="text-navy-400">Transverse</span><span>×{(1 / Math.sqrt(1 - beta * beta)).toFixed(4)}</span></div>
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>The relativistic Doppler formula (longitudinal):</p>
          <Eq>{"f_obs = f_source · √((1+β)/(1-β))  [approaching]"}</Eq>
          <Eq>{"f_obs = f_source · √((1-β)/(1+β))  [receding]"}</Eq>
          <p>Unlike the classical Doppler effect, there is also a transverse Doppler effect due to time dilation:</p>
          <Eq>{"f_transverse = f_source / γ"}</Eq>
          <p>This purely relativistic effect has no classical analogue and was confirmed by the Ives-Stilwell experiment (1938).</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
