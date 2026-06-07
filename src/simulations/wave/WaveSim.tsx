import { useState, useRef, useCallback, useEffect } from 'react'
import SimulationLayout from '../../components/SimulationLayout'
import Slider from '../../components/Slider'
import PhysicsInfo, { Eq } from '../../components/PhysicsInfo'
import { useAnimation } from '../../hooks/useAnimation'
import { wavelengthToColor, intensity } from './physics'

type Mode = 'animated' | 'pattern'

export default function WaveSim() {
  const [wavelengthNm, setWavelengthNm] = useState(550)
  const [slitSpacing, setSlitSpacing] = useState(10) // μm
  const [slitWidth, setSlitWidth] = useState(2) // μm
  const [screenDist, setScreenDist] = useState(1) // m
  const [numSlits, setNumSlits] = useState(2)
  const [mode, setMode] = useState<Mode>('animated')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<HTMLCanvasElement>(null)
  const timeRef = useRef(0)

  const color = wavelengthToColor(wavelengthNm)

  const drawPattern = useCallback(() => {
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

    const lambda = wavelengthNm * 1e-9
    const d = slitSpacing * 1e-6
    const a = slitWidth * 1e-6
    const [r, g, b] = parseRgb(color)

    if (mode === 'pattern') {
      // Static interference pattern
      const imgData = ctx.createImageData(Math.ceil(w), Math.ceil(h))
      const data = imgData.data

      for (let py = 0; py < h; py++) {
        const sinTheta = (py - h / 2) / (h / 2) * 0.1
        const I = intensity(sinTheta, lambda, a, d, numSlits)

        for (let px = 0; px < w; px++) {
          // Add subtle horizontal variation for visual interest
          const xFade = 1 - Math.abs(px - w / 2) / (w / 2) * 0.3
          const bright = I * xFade
          const idx = (Math.floor(py) * Math.ceil(w) + Math.floor(px)) * 4
          data[idx] = Math.min(255, r * bright)
          data[idx + 1] = Math.min(255, g * bright)
          data[idx + 2] = Math.min(255, b * bright)
          data[idx + 3] = 255
        }
      }
      ctx.putImageData(imgData, 0, 0)
    } else {
      // Animated wave propagation
      const t = timeRef.current
      const slitX = w * 0.25

      // Draw barrier
      ctx.fillStyle = '#334155'
      ctx.fillRect(slitX - 3, 0, 6, h)

      // Slit openings
      const slitPositions: number[] = []
      for (let i = 0; i < numSlits; i++) {
        const y = h / 2 + (i - (numSlits - 1) / 2) * (slitSpacing * 1e-6 / lambda) * 8
        slitPositions.push(y)
        ctx.clearRect(slitX - 3, y - 4, 6, 8)
      }

      // Incoming wave (left side)
      for (let px = 0; px < slitX - 3; px += 2) {
        const phase = px * 0.08 - t * 4
        const amp = (Math.sin(phase) + 1) / 2
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${amp * 0.3})`
        ctx.fillRect(px, 0, 2, h)
      }

      // Outgoing waves (right side) - interference
      const stepX = 3
      const stepY = 3
      for (let px = slitX + 4; px < w; px += stepX) {
        for (let py = 0; py < h; py += stepY) {
          let totalAmp = 0
          for (const sy of slitPositions) {
            const dx = px - slitX
            const dy = py - sy
            const dist = Math.sqrt(dx * dx + dy * dy)
            const waveK = 2 * Math.PI / 20
            totalAmp += Math.sin(dist * waveK - t * 4) / Math.max(1, Math.sqrt(dist) * 0.15)
          }
          const normAmp = totalAmp / numSlits
          const bright = (normAmp + 1) / 2
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bright * 0.7})`
          ctx.fillRect(px, py, stepX, stepY)
        }
      }
    }

    ctx.restore()
  }, [wavelengthNm, slitSpacing, slitWidth, numSlits, mode, color])

  const drawGraph = useCallback(() => {
    const canvas = graphRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const lambda = wavelengthNm * 1e-9
    const d = slitSpacing * 1e-6
    const a = slitWidth * 1e-6
    const [r, g, b] = parseRgb(color)

    const margin = 8
    const plotW = w - margin * 2
    const plotH = h - margin * 2

    // Plot intensity distribution
    ctx.beginPath()
    ctx.moveTo(margin, h - margin)
    const points = 300
    for (let i = 0; i <= points; i++) {
      const sinTheta = (i / points - 0.5) * 0.2
      const I = intensity(sinTheta, lambda, a, d, numSlits)
      const x = margin + (i / points) * plotW
      const y = h - margin - I * plotH * 0.9
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Fill under curve
    ctx.lineTo(margin + plotW, h - margin)
    ctx.lineTo(margin, h - margin)
    ctx.closePath()
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`
    ctx.fill()

    ctx.fillStyle = '#64748b'
    ctx.font = '10px sans-serif'
    ctx.fillText('Intensity Distribution on Screen', margin, 12)

    ctx.restore()
  }, [wavelengthNm, slitSpacing, slitWidth, numSlits, color])

  useAnimation(() => {
    timeRef.current += 0.016
    drawPattern()
  }, mode === 'animated')

  useEffect(() => {
    const setup = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return
      const parent = canvas.parentElement!
      const dpr = window.devicePixelRatio || 1
      canvas.width = parent.clientWidth * dpr
      canvas.height = parent.clientHeight * dpr
      canvas.style.width = `${parent.clientWidth}px`
      canvas.style.height = `${parent.clientHeight}px`
    }
    setup(canvasRef.current)
    setup(graphRef.current)
    drawPattern()
    drawGraph()

    const onResize = () => {
      setup(canvasRef.current)
      setup(graphRef.current)
      drawPattern()
      drawGraph()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawPattern, drawGraph])

  useEffect(() => {
    if (mode === 'pattern') drawPattern()
    drawGraph()
  }, [wavelengthNm, slitSpacing, slitWidth, numSlits, screenDist, mode, drawPattern, drawGraph])

  return (
    <SimulationLayout title="Wave Interference" color="#818cf8" controls={
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('animated')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'animated' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-navy-800 text-navy-400'
            }`}
          >
            Animated
          </button>
          <button
            onClick={() => setMode('pattern')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'pattern' ? 'bg-neon-blue/20 text-neon-blue' : 'bg-navy-800 text-navy-400'
            }`}
          >
            Pattern
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-navy-400">Color:</span>
          <div className="w-6 h-6 rounded-full border border-navy-700" style={{ backgroundColor: color }} />
          <span className="text-sm text-navy-300 font-mono">{wavelengthNm} nm</span>
        </div>

        <Slider label="Wavelength" value={wavelengthNm} min={400} max={700} step={5} unit="nm" onChange={setWavelengthNm} />
        <Slider label="Slit Spacing (d)" value={slitSpacing} min={1} max={50} step={0.5} unit="μm" onChange={setSlitSpacing} />
        <Slider label="Slit Width (a)" value={slitWidth} min={0.5} max={20} step={0.5} unit="μm" onChange={setSlitWidth} />
        <Slider label="Screen Distance" value={screenDist} min={0.1} max={5} step={0.1} unit="m" onChange={setScreenDist} />
        <Slider label="Number of Slits" value={numSlits} min={1} max={8} step={1} onChange={setNumSlits} />

        <div className="rounded-lg overflow-hidden bg-navy-950 border border-navy-800" style={{ height: 140 }}>
          <canvas ref={graphRef} className="w-full h-full" />
        </div>
        <PhysicsInfo title="Physics Behind This">
          <p>Multi-slit interference intensity:</p>
          <Eq>{"I(θ) = I₀ · [sin(Nδ/2)/sin(δ/2)]² · sinc²(πa·sinθ/λ)"}</Eq>
          <p>Where:</p>
          <Eq>{"δ = 2π · d · sin(θ) / λ"}</Eq>
          <p><strong>d</strong> = slit spacing, <strong>a</strong> = slit width, <strong>N</strong> = number of slits, <strong>λ</strong> = wavelength.</p>
          <p>The sinc² term is the single-slit diffraction envelope. The [sin(Nδ/2)/sin(δ/2)]² term gives the N-slit interference pattern with sharp principal maxima.</p>
          <p>More slits → sharper peaks. Larger d → closer fringes.</p>
        </PhysicsInfo>
      </div>
    }>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </SimulationLayout>
  )
}

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/\d+/g)
  if (!m) return [255, 255, 255]
  return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])]
}
