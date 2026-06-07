import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'

const COLOR = '#34d399'

const MATERIALS: Record<string, { name: string; workFunction: number; color: string }> = {
  Na: { name: 'Sodium', workFunction: 2.28, color: '#94a3b8' },
  K: { name: 'Potassium', workFunction: 2.30, color: '#a78bfa' },
  Cu: { name: 'Copper', workFunction: 4.65, color: '#fb923c' },
  Pt: { name: 'Platinum', workFunction: 5.65, color: '#94a3b8' },
}

function wavelengthToColor(nm: number): string {
  let r = 0, g = 0, b = 0
  if (nm < 380) { r = 0.4; g = 0; b = 0.6 } // UV shown as purple
  else if (nm < 440) { r = -(nm - 440) / 60; b = 1 }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65 }
  else { r = 1 }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`
}

export default function PhotoelectricSim() {
  const [wavelength, setWavelength] = useState(400)
  const [intensity, setIntensity] = useState(5)
  const [material, setMaterial] = useState<keyof typeof MATERIALS>('Na')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)
  const electrons = useRef<{ x: number; y: number; vx: number; vy: number; age: number }[]>([])

  const h_eV = 4.136e-15 // eV·s
  const c = 3e8
  const photonEnergy = (h_eV * c) / (wavelength * 1e-9) // eV
  const workFunc = MATERIALS[material].workFunction
  const keMax = Math.max(0, photonEnergy - workFunc)
  const emits = photonEnergy >= workFunc

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h2 = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h2)

    const metalX = w * 0.55
    const metalY1 = 40, metalY2 = h2 - 40

    // Metal surface
    ctx.fillStyle = '#475569'
    ctx.fillRect(metalX, metalY1, 40, metalY2 - metalY1)
    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(MATERIALS[material].name, metalX + 20, metalY2 + 16)
    ctx.fillText(`φ = ${workFunc.toFixed(2)} eV`, metalX + 20, metalY2 + 30)

    // Incoming photons
    const color = wavelengthToColor(wavelength)
    const t = timeRef.current
    for (let i = 0; i < intensity; i++) {
      const offset = (i / intensity) * (metalY2 - metalY1 - 40) + metalY1 + 20
      const px = metalX - 80 + ((t * 150 + i * 43) % 120)
      if (px < metalX - 5) {
        ctx.strokeStyle = color; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(px, offset); ctx.lineTo(px + 20, offset); ctx.stroke()
        // Arrow
        ctx.beginPath(); ctx.moveTo(px + 20, offset); ctx.lineTo(px + 14, offset - 4); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(px + 20, offset); ctx.lineTo(px + 14, offset + 4); ctx.stroke()
      }
    }

    // Photon wave label
    ctx.fillStyle = color; ctx.font = '12px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`λ = ${wavelength} nm`, 12, 24)
    ctx.fillText(`E = ${photonEnergy.toFixed(2)} eV`, 12, 40)

    // Emitted electrons
    for (const e of electrons.current) {
      ctx.fillStyle = '#22d3ee'
      ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    // Status
    ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
    if (emits) {
      ctx.fillStyle = '#34d399'
      ctx.fillText(`Electrons emitted! KE_max = ${keMax.toFixed(2)} eV`, w * 0.3, h2 - 10)
    } else {
      ctx.fillStyle = '#ef4444'
      ctx.fillText(`No emission: E_photon (${photonEnergy.toFixed(2)}) < φ (${workFunc.toFixed(2)})`, w * 0.3, h2 - 10)
    }

    ctx.restore()
  }, [wavelength, intensity, material, photonEnergy, workFunc, keMax, emits])

  const drawGraph = useCallback(() => {
    const canvas = graphRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr, h2 = canvas.height / dpr
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h2)

    const margin = 8
    const pw = w - margin * 2
    const ph = h2 - margin * 2 - 12

    // Plot KE_max vs frequency
    const fMax = 2e15
    const keRange = 6 // eV

    // Axis
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(margin, h2 - margin); ctx.lineTo(margin + pw, h2 - margin); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(margin, margin + 12); ctx.lineTo(margin, h2 - margin); ctx.stroke()

    // Line: KE = hf - φ
    const f0 = workFunc / (h_eV) // threshold frequency
    ctx.strokeStyle = COLOR; ctx.lineWidth = 2; ctx.beginPath()
    const x0 = margin + (f0 / fMax) * pw
    ctx.moveTo(x0, h2 - margin)
    const f1 = fMax
    const ke1 = h_eV * f1 - workFunc
    ctx.lineTo(margin + pw, h2 - margin - (ke1 / keRange) * ph)
    ctx.stroke()

    // Current point
    const currentF = c / (wavelength * 1e-9)
    const cpx = margin + (currentF / fMax) * pw
    const cpy = emits ? h2 - margin - (keMax / keRange) * ph : h2 - margin
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath(); ctx.arc(cpx, cpy, 5, 0, Math.PI * 2); ctx.fill()

    // Threshold
    ctx.setLineDash([3, 3]); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x0, margin + 12); ctx.lineTo(x0, h2 - margin); ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#64748b'; ctx.font = '9px sans-serif'
    ctx.fillText('KEmax vs f', margin, 10)
    ctx.fillText('f₀', x0, h2 - margin + 10)

    ctx.restore()
  }, [wavelength, material, workFunc, keMax, emits])

  useAnimation((dt) => {
    timeRef.current += dt
    // Emit electrons
    if (emits && Math.random() < intensity * 0.3 * dt) {
      const canvas = canvasRef.current; if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const h2 = canvas.height / dpr
      const metalX = (canvas.width / dpr) * 0.55
      const speed = Math.sqrt(keMax) * 80
      electrons.current.push({
        x: metalX + 42,
        y: 60 + Math.random() * (h2 - 120),
        vx: speed * (0.5 + Math.random() * 0.5),
        vy: (Math.random() - 0.5) * speed * 0.5,
        age: 0,
      })
    }
    // Update electrons
    electrons.current = electrons.current.filter(e => {
      e.x += e.vx * dt; e.y += e.vy * dt; e.age += dt
      return e.age < 3
    })
    draw()
  }, true)

  useEffect(() => { drawGraph() }, [drawGraph])

  useEffect(() => {
    const setup = (c: HTMLCanvasElement | null) => { if (!c) return; const p = c.parentElement!; const dpr = window.devicePixelRatio || 1; c.width = p.clientWidth * dpr; c.height = p.clientHeight * dpr; c.style.width = `${p.clientWidth}px`; c.style.height = `${p.clientHeight}px` }
    setup(canvasRef.current); setup(graphRef.current); draw(); drawGraph()
    const onResize = () => { setup(canvasRef.current); setup(graphRef.current); draw(); drawGraph() }
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize)
  }, [draw, drawGraph])

  return (
    <SimulationLayout title="Photoelectric Effect" color={COLOR} controls={
      <div className="space-y-4">
        <Slider label="Wavelength" value={wavelength} min={100} max={700} step={10} unit="nm" onChange={setWavelength} />
        <Slider label="Intensity" value={intensity} min={1} max={10} step={1} onChange={setIntensity} />
        <div className="space-y-1">
          <span className="text-xs text-navy-500">Material</span>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(MATERIALS).map(([key, mat]) => (
              <button key={key} onClick={() => setMaterial(key as keyof typeof MATERIALS)} className={`py-1.5 rounded text-xs font-medium ${material === key ? 'bg-green-500/20 text-green-400' : 'bg-navy-800 text-navy-400'}`}>{mat.name} ({mat.workFunction}eV)</button>
            ))}
          </div>
        </div>
        <div className="rounded-lg overflow-hidden bg-navy-950 border border-navy-800" style={{ height: 120 }}>
          <canvas ref={graphRef} className="w-full h-full" />
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>Einstein's photoelectric equation (1905):</p>
          <Eq>{"KE_max = hf - φ = hc/λ - φ"}</Eq>
          <p>Key predictions that contradicted classical wave theory:</p>
          <p>1. Below threshold frequency f₀ = φ/h, no electrons are emitted regardless of intensity.</p>
          <p>2. KE_max depends on frequency, not intensity.</p>
          <p>3. Increasing intensity increases the number of electrons, not their energy.</p>
          <p>This demonstrated the particle nature of light (photons) and won Einstein the Nobel Prize.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}
