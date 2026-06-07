import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PlaybackControls from '../../components/PlaybackControls'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#a78bfa'

export default function LengthContractionSim() {
  const [beta, setBeta] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showLightClock, setShowLightClock] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const posRef = useRef(0)

  const gamma = 1 / Math.sqrt(1 - beta * beta)

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)

    const t = timeRef.current

    // === TOP: Length Contraction ===
    const topY = h * 0.25
    const restLen = 200
    const contractedLen = restLen / gamma

    // Rest frame ruler
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Rest frame (proper length)', w / 2, topY - 40)
    ctx.fillStyle = '#475569'
    ctx.fillRect(w / 2 - restLen / 2, topY - 12, restLen, 24)
    ctx.fillStyle = '#f1f5f9'; ctx.font = '10px monospace'
    ctx.fillText(`L₀ = ${restLen.toFixed(0)} m`, w / 2, topY + 4)
    // Tick marks
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const x = w / 2 - restLen / 2 + i * restLen / 10
      ctx.beginPath(); ctx.moveTo(x, topY - 12); ctx.lineTo(x, topY - 18); ctx.stroke()
    }

    // Moving frame ruler
    const moveY = topY + 60
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'
    ctx.fillText(`Observer frame (v = ${beta.toFixed(2)}c)`, w / 2, moveY - 25)
    ctx.fillStyle = COLOR
    const rulerX = w / 2 - contractedLen / 2 + (playing ? Math.sin(t) * 30 : 0)
    ctx.fillRect(rulerX, moveY - 12, contractedLen, 24)
    ctx.fillStyle = '#fff'; ctx.font = '10px monospace'
    ctx.fillText(`L = ${contractedLen.toFixed(1)} m`, rulerX + contractedLen / 2, moveY + 4)

    // Arrow showing contraction
    if (beta > 0.05) {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(w / 2 - restLen / 2, topY + 16); ctx.lineTo(rulerX, moveY - 16); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(w / 2 + restLen / 2, topY + 16); ctx.lineTo(rulerX + contractedLen, moveY - 16); ctx.stroke()
      ctx.setLineDash([])
    }

    // === BOTTOM: Time Dilation (Light Clock) ===
    if (showLightClock) {
      const clockY = h * 0.65
      const clockH = 100
      const clockW = 60
      const period = 2 // seconds for one bounce in rest frame

      // Rest frame light clock (stationary)
      const restClockX = w * 0.25
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Rest frame clock', restClockX, clockY - clockH / 2 - 15)

      // Mirrors
      ctx.fillStyle = '#64748b'
      ctx.fillRect(restClockX - clockW / 2, clockY - clockH / 2, clockW, 4)
      ctx.fillRect(restClockX - clockW / 2, clockY + clockH / 2 - 4, clockW, 4)

      // Photon bouncing
      const phase = (t / period) % 1
      const photonY = phase < 0.5
        ? clockY - clockH / 2 + 4 + phase * 2 * (clockH - 8)
        : clockY + clockH / 2 - 4 - (phase - 0.5) * 2 * (clockH - 8)

      ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(restClockX, photonY, 4, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0

      // Moving frame light clock
      const moveClockX = w * 0.7
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif'
      ctx.fillText('Moving frame clock (dilated)', moveClockX, clockY - clockH / 2 - 15)

      const dilatedPeriod = period * gamma
      const phase2 = (t / dilatedPeriod) % 1
      const dx = beta * 150 * (t / dilatedPeriod % 1)

      // Moving mirrors
      ctx.fillStyle = '#64748b'
      ctx.fillRect(moveClockX - clockW / 2 + dx - 40, clockY - clockH / 2, clockW, 4)
      ctx.fillRect(moveClockX - clockW / 2 + dx - 40, clockY + clockH / 2 - 4, clockW, 4)

      // Moving photon (diagonal path)
      const photonY2 = phase2 < 0.5
        ? clockY - clockH / 2 + 4 + phase2 * 2 * (clockH - 8)
        : clockY + clockH / 2 - 4 - (phase2 - 0.5) * 2 * (clockH - 8)
      const photonX2 = moveClockX + dx - 40

      ctx.fillStyle = '#fbbf24'; ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(photonX2, photonY2, 4, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0

      // Time displays
      const restTicks = Math.floor(t / period)
      const moveTicks = Math.floor(t / dilatedPeriod)
      ctx.fillStyle = '#f1f5f9'; ctx.font = '14px monospace'
      ctx.fillText(`ticks: ${restTicks}`, restClockX, clockY + clockH / 2 + 25)
      ctx.fillText(`ticks: ${moveTicks}`, moveClockX, clockY + clockH / 2 + 25)
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'
      ctx.fillText(`Δt₀ = ${period.toFixed(1)}s`, restClockX, clockY + clockH / 2 + 42)
      ctx.fillText(`Δt = ${dilatedPeriod.toFixed(2)}s`, moveClockX, clockY + clockH / 2 + 42)
    }

    // Info bar
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`β = ${beta.toFixed(2)}  γ = ${gamma.toFixed(3)}  L/L₀ = ${(1 / gamma).toFixed(3)}  Δt/Δt₀ = ${gamma.toFixed(3)}`, 12, h - 10)

    ctx.restore()
  }, [beta, gamma, showLightClock])

  useAnimation((dt) => { timeRef.current += dt; posRef.current += beta * dt; draw() }, playing)

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const setup = () => { const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px`; draw() }
    setup(); window.addEventListener('resize', setup); return () => window.removeEventListener('resize', setup)
  }, [draw])

  return (
    <SimulationLayout title="Length Contraction & Time Dilation" color={COLOR} controls={
      <div className="space-y-4">
        <PlaybackControls playing={playing} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onReset={() => { timeRef.current = 0; posRef.current = 0; setPlaying(false); draw() }} />
        <Slider label="β = v/c" value={beta} min={0} max={0.99} step={0.01} onChange={setBeta} />
        <label className="flex items-center gap-2 text-sm text-navy-400"><input type="checkbox" checked={showLightClock} onChange={e => setShowLightClock(e.target.checked)} /> Show light clock</label>
        <PhysicsInfo title="Physics Behind This">
          <p>Special relativity predicts two key effects for moving objects:</p>
          <Eq>{"L = L₀/γ = L₀√(1 - v²/c²)"}</Eq>
          <Eq>{"Δt = γΔt₀ = Δt₀/√(1 - v²/c²)"}</Eq>
          <p>Moving objects are contracted along the direction of motion. Moving clocks tick slower.</p>
          <p>The light clock thought experiment (Einstein) shows why: the photon travels a longer diagonal path in the observer's frame.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
