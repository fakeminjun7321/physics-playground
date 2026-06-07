import { Link } from 'react-router-dom'
import { useRef, useEffect } from 'react'

interface SimCard {
  title: string
  description: string
  path: string
  color: string
  category: string
  drawPreview: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void
}

const simulations: SimCard[] = [
  // ── Mechanics ──
  {
    title: 'Double Pendulum',
    description: 'Chaotic motion from coupled nonlinear Lagrangian dynamics',
    path: '/double-pendulum',
    color: '#22d3ee',
    category: 'Mechanics',
    drawPreview: (ctx, w, h, t) => {
      const cx = w / 2, py = h * 0.12, L = h * 0.32
      const a1 = Math.sin(t * 2.3) * 0.8 + 0.3 * Math.sin(t * 3.7)
      const a2 = Math.sin(t * 3.1 + 1) * 1.0 + 0.4 * Math.sin(t * 1.9)
      const x1 = cx + Math.sin(a1) * L, y1 = py + Math.cos(a1) * L
      const x2 = x1 + Math.sin(a2) * L, y2 = y1 + Math.cos(a2) * L
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      ctx.fillStyle = '#0e7490'; ctx.beginPath(); ctx.arc(x1, y1, 6, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(x2, y2, 7, 0, Math.PI * 2); ctx.fill()
    },
  },
  {
    title: 'Three-Body Problem',
    description: 'Gravitational chaos — figure-8, Euler & Lagrange solutions',
    path: '/three-body',
    color: '#f59e0b',
    category: 'Mechanics',
    drawPreview: (ctx, w, h, t) => {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.28
      const colors = ['#f59e0b', '#fb923c', '#fbbf24']
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + t * 0.8
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6
        ctx.fillStyle = colors[i]
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = colors[i]; ctx.globalAlpha = 0.3; ctx.lineWidth = 1
        ctx.beginPath()
        for (let j = 0; j <= 40; j++) {
          const pa = a - j * 0.08
          const px = cx + Math.cos(pa) * r, ppy = cy + Math.sin(pa) * r * 0.6
          j === 0 ? ctx.moveTo(px, ppy) : ctx.lineTo(px, ppy)
        }
        ctx.stroke(); ctx.globalAlpha = 1
      }
    },
  },
  {
    title: 'Coupled Oscillators',
    description: 'Normal modes & energy transfer in spring-mass chains',
    path: '/coupled-oscillators',
    color: '#a78bfa',
    category: 'Mechanics',
    drawPreview: (ctx, w, h, t) => {
      const n = 8, spacing = w / (n + 1), cy = h / 2
      for (let i = 0; i < n; i++) {
        const x = spacing * (i + 1)
        const dy = Math.sin(((i + 1) / (n + 1)) * Math.PI) * Math.sin(t * 3) * h * 0.25
        if (i > 0) {
          const px = spacing * i
          const pdy = Math.sin((i / (n + 1)) * Math.PI) * Math.sin(t * 3) * h * 0.25
          ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(px, cy + pdy); ctx.lineTo(x, cy + dy); ctx.stroke()
        }
        ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(x, cy + dy, 5, 0, Math.PI * 2); ctx.fill()
      }
    },
  },
  // ── Electromagnetism ──
  {
    title: 'EM Wave Propagation',
    description: 'Oscillating E & B fields with Poynting vector visualization',
    path: '/em-wave',
    color: '#818cf8',
    category: 'Electromagnetism',
    drawPreview: (ctx, w, h, t) => {
      const cy = h / 2, amp = h * 0.3
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.beginPath()
      for (let x = 0; x < w; x += 2) {
        const y = cy + Math.sin(x * 0.05 - t * 3) * amp * 0.8
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.beginPath()
      for (let x = 0; x < w; x += 2) {
        const y = cy + Math.cos(x * 0.05 - t * 3) * amp * 0.5
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.strokeStyle = '#475569'; ctx.setLineDash([4, 4]); ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()
      ctx.setLineDash([])
    },
  },
  {
    title: 'Charged Particle in EM Field',
    description: 'Cyclotron motion, helical paths & E×B drift',
    path: '/charged-particle',
    color: '#f472b6',
    category: 'Electromagnetism',
    drawPreview: (ctx, w, h, t) => {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.3
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1.5; ctx.beginPath()
      for (let i = 0; i <= 200; i++) {
        const a = (i / 200) * Math.PI * 4
        const progress = i / 200
        if (progress > (t * 0.3) % 1) break
        const x = cx + Math.cos(a) * r * (1 - progress * 0.3)
        const y = cy + Math.sin(a) * r * (1 - progress * 0.3)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      const phase = (t * 0.3) % 1
      const a = phase * Math.PI * 4
      const px = cx + Math.cos(a) * r * (1 - phase * 0.3)
      const ppy = cy + Math.sin(a) * r * (1 - phase * 0.3)
      ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.arc(px, ppy, 4, 0, Math.PI * 2); ctx.fill()
    },
  },
  {
    title: 'RLC Circuit',
    description: 'Damped & driven oscillations, resonance curves',
    path: '/rlc-circuit',
    color: '#34d399',
    category: 'Electromagnetism',
    drawPreview: (ctx, w, h, t) => {
      const cy = h / 2, amp = h * 0.35
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.beginPath()
      for (let x = 0; x < w; x += 2) {
        const phase = x / w * 6 * Math.PI
        const decay = Math.exp(-x / w * 2)
        const y = cy + Math.sin(phase - t * 4) * amp * decay
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.strokeStyle = '#065f46'; ctx.setLineDash([3, 3]); ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()
      ctx.setLineDash([])
    },
  },
  {
    title: 'Electromagnetic Induction',
    description: "Faraday's law — magnet through coil, EMF & Lenz's law",
    path: '/em-induction',
    color: '#fb923c',
    category: 'Electromagnetism',
    drawPreview: (ctx, w, h, t) => {
      const cx = w / 2, cy = h / 2
      const coilW = w * 0.25, coilH = h * 0.35
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2
      ctx.strokeRect(cx - coilW / 2, cy - coilH / 2, coilW, coilH)
      const magnetY = cy + Math.sin(t * 2) * h * 0.35
      const mw = w * 0.12, mh = h * 0.18
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(cx - mw / 2, magnetY - mh / 2, mw, mh / 2)
      ctx.fillStyle = '#3b82f6'
      ctx.fillRect(cx - mw / 2, magnetY, mw, mh / 2)
      ctx.fillStyle = '#fff'; ctx.font = `${Math.max(8, h * 0.06)}px sans-serif`; ctx.textAlign = 'center'
      ctx.fillText('N', cx, magnetY - mh * 0.1)
      ctx.fillText('S', cx, magnetY + mh * 0.35)
    },
  },
  // ── Waves & Optics ──
  {
    title: 'Wave Interference',
    description: 'Multi-slit diffraction & interference patterns',
    path: '/wave',
    color: '#818cf8',
    category: 'Waves & Optics',
    drawPreview: (ctx, w, h, t) => {
      const cx1 = w * 0.3, cx2 = w * 0.7, cy = h / 2
      for (let x = 0; x < w; x += 3) {
        for (let y = 0; y < h; y += 3) {
          const d1 = Math.sqrt((x - cx1) * (x - cx1) + (y - cy) * (y - cy))
          const d2 = Math.sqrt((x - cx2) * (x - cx2) + (y - cy) * (y - cy))
          const v = (Math.sin(d1 * 0.15 - t * 3) + Math.sin(d2 * 0.15 - t * 3)) / 2
          ctx.fillStyle = `rgba(129,140,248,${(v + 1) / 2 * 0.7})`
          ctx.fillRect(x, y, 3, 3)
        }
      }
    },
  },
  {
    title: 'Blackbody Radiation',
    description: 'Planck vs Rayleigh-Jeans — the UV catastrophe',
    path: '/blackbody',
    color: '#fbbf24',
    category: 'Waves & Optics',
    drawPreview: (ctx, w, h, t) => {
      const T = 4000 + Math.sin(t * 0.5) * 2000
      const margin = 15
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.beginPath()
      for (let i = 0; i < w - margin * 2; i++) {
        const lam = 0.1 + (i / (w - margin * 2)) * 3.0
        const x5 = lam * lam * lam * lam * lam
        const exp = Math.exp(Math.min(14.388 / (lam * T * 1e-4), 500))
        const B = 1 / (x5 * (exp - 1))
        const y = h - margin - Math.min(B * 0.00002, h - margin * 2)
        i === 0 ? ctx.moveTo(margin + i, y) : ctx.lineTo(margin + i, y)
      }
      ctx.stroke()
    },
  },
  // ── Special Relativity ──
  {
    title: 'Lorentz Transformation',
    description: 'Minkowski diagram — simultaneity & light cones',
    path: '/lorentz',
    color: '#38bdf8',
    category: 'Special Relativity',
    drawPreview: (ctx, w, h, t) => {
      const cx = w / 2, cy = h / 2
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()
      ctx.strokeStyle = '#fbbf24'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, 0); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke()
      ctx.setLineDash([])
      const beta = 0.3 + Math.sin(t) * 0.25
      const angle = Math.atan(beta)
      const len = Math.min(w, h) * 0.4
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.sin(angle) * len, cy - Math.cos(angle) * len); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * len, cy - Math.sin(angle) * len); ctx.stroke()
    },
  },
  {
    title: 'Length Contraction',
    description: 'Relativistic length contraction & light clock time dilation',
    path: '/length-contraction',
    color: '#c084fc',
    category: 'Special Relativity',
    drawPreview: (ctx, w, h, t) => {
      const beta = 0.3 + Math.sin(t * 0.7) * 0.25
      const gamma = 1 / Math.sqrt(1 - beta * beta)
      const restLen = w * 0.5, contractedLen = restLen / gamma
      const y1 = h * 0.3, y2 = h * 0.7, cx = w / 2
      ctx.fillStyle = '#c084fc'; ctx.globalAlpha = 0.5
      ctx.fillRect(cx - restLen / 2, y1 - 8, restLen, 16)
      ctx.globalAlpha = 1; ctx.fillStyle = '#c084fc'
      ctx.fillRect(cx - contractedLen / 2, y2 - 8, contractedLen, 16)
      ctx.fillStyle = '#e2e8f0'; ctx.font = `${Math.max(9, h * 0.07)}px monospace`; ctx.textAlign = 'center'
      ctx.fillText('Rest', cx, y1 - 14)
      ctx.fillText(`v = ${(beta).toFixed(2)}c`, cx, y2 - 14)
    },
  },
  {
    title: 'Relativistic Doppler',
    description: 'Frequency shift from relativistic source motion',
    path: '/rel-doppler',
    color: '#f87171',
    category: 'Special Relativity',
    drawPreview: (ctx, w, h, t) => {
      const sx = w * 0.3 + Math.sin(t * 0.5) * w * 0.15
      const cy = h / 2
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(sx, cy, 6, 0, Math.PI * 2); ctx.fill()
      for (let i = 0; i < 5; i++) {
        const r = ((t * 60 + i * 30) % 150)
        const alpha = 1 - r / 150
        ctx.strokeStyle = `rgba(248,113,113,${alpha * 0.6})`
        ctx.lineWidth = 1.5; ctx.beginPath()
        ctx.arc(sx - i * 3, cy, r, 0, Math.PI * 2); ctx.stroke()
      }
    },
  },
  // ── Modern / Quantum Physics ──
  {
    title: 'Quantum Tunneling',
    description: 'Wave packet vs potential barrier — Schrödinger equation',
    path: '/quantum-tunnel',
    color: '#2dd4bf',
    category: 'Modern Physics',
    drawPreview: (ctx, w, h, t) => {
      const cy = h * 0.55
      const bx = w * 0.5, bw = w * 0.12
      ctx.fillStyle = 'rgba(100,116,139,0.5)'
      ctx.fillRect(bx - bw / 2, h * 0.15, bw, h * 0.7)
      ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 2; ctx.beginPath()
      const phase = (t * 0.4) % 2
      for (let x = 0; x < w; x += 2) {
        const rel = (x / w - phase * 0.5 + 0.2)
        const env = Math.exp(-rel * rel * 40)
        const osc = Math.sin(x * 0.3 - t * 6)
        const y = cy - env * osc * h * 0.25
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    },
  },
  {
    title: 'Hydrogen Atom Orbitals',
    description: 'Probability density |ψ|² for quantum numbers n, l, m',
    path: '/hydrogen-orbital',
    color: '#60a5fa',
    category: 'Modern Physics',
    drawPreview: (ctx, w, h, _t) => {
      const cx = w / 2, cy = h / 2
      const maxR = Math.min(w, h) * 0.45
      for (let y = 0; y < h; y += 3) {
        for (let x = 0; x < w; x += 3) {
          const dx = x - cx, dy = y - cy
          const r = Math.sqrt(dx * dx + dy * dy) / maxR * 8
          const cosTheta = -dy / (Math.sqrt(dx * dx + dy * dy) || 1)
          const rho = 2 * r / 2
          const R = (1 / 4) * Math.sqrt(2) * rho * Math.exp(-rho / 2)
          const Y = Math.sqrt(3 / (4 * Math.PI)) * cosTheta
          const psi2 = R * R * Y * Y * 800
          const brightness = Math.min(psi2, 1)
          if (brightness > 0.01) {
            ctx.fillStyle = `rgba(96,165,250,${brightness * 0.9})`
            ctx.fillRect(x, y, 3, 3)
          }
        }
      }
    },
  },
  {
    title: 'Photoelectric Effect',
    description: 'Photon energy threshold, work function & KE_max',
    path: '/photoelectric',
    color: '#facc15',
    category: 'Modern Physics',
    drawPreview: (ctx, w, h, t) => {
      const plateY = h * 0.65, plateW = w * 0.6
      ctx.fillStyle = '#64748b'
      ctx.fillRect(w / 2 - plateW / 2, plateY, plateW, 6)
      for (let i = 0; i < 4; i++) {
        const px = w * 0.25 + i * w * 0.15
        const arrY = (t * 80 + i * 40) % (plateY)
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(px, arrY); ctx.lineTo(px, arrY + 15); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(px, arrY + 15)
        ctx.lineTo(px - 3, arrY + 10); ctx.lineTo(px + 3, arrY + 10); ctx.closePath()
        ctx.fillStyle = '#facc15'; ctx.fill()
      }
      for (let i = 0; i < 3; i++) {
        const ex = w * 0.3 + i * w * 0.2
        const ey = plateY - ((t * 50 + i * 25) % (plateY * 0.5))
        ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill()
      }
    },
  },
]

const categories = ['Mechanics', 'Electromagnetism', 'Waves & Optics', 'Special Relativity', 'Modern Physics']
const categoryColors: Record<string, string> = {
  'Mechanics': '#22d3ee',
  'Electromagnetism': '#34d399',
  'Waves & Optics': '#818cf8',
  'Special Relativity': '#38bdf8',
  'Modern Physics': '#facc15',
}

function PreviewCanvas({ draw, color }: { draw: SimCard['drawPreview']; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const parent = canvas.parentElement!
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    }
    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    const loop = (now: number) => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      draw(ctx, w, h, (now - start) / 1000)
      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [draw, color])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}

export default function HubPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      <header className="text-center pt-12 pb-8 px-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <svg width="36" height="36" viewBox="0 0 64 64">
            <ellipse cx="32" cy="32" rx="24" ry="10" fill="none" stroke="#38bdf8" strokeWidth="2.5" transform="rotate(0 32 32)"/>
            <ellipse cx="32" cy="32" rx="24" ry="10" fill="none" stroke="#818cf8" strokeWidth="2.5" transform="rotate(60 32 32)"/>
            <ellipse cx="32" cy="32" rx="24" ry="10" fill="none" stroke="#f472b6" strokeWidth="2.5" transform="rotate(-60 32 32)"/>
            <circle cx="32" cy="32" r="4" fill="#f8fafc"/>
          </svg>
          <h1 className="text-3xl font-bold text-navy-100">Physics Lab</h1>
        </div>
        <p className="text-navy-400 text-sm max-w-lg mx-auto">
          15 interactive university-level physics simulations — mechanics, electromagnetism,
          relativity & modern physics. Powered by real equations.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-12">
        {categories.map((cat) => {
          const sims = simulations.filter((s) => s.category === cat)
          return (
            <section key={cat} className="mb-8">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-3 pl-1"
                style={{ color: categoryColors[cat] }}
              >
                {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sims.map((sim) => (
                  <Link
                    key={sim.path}
                    to={sim.path}
                    className="group block rounded-xl overflow-hidden border border-navy-800 hover:border-opacity-80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <div className="relative h-40 bg-navy-900/80">
                      <PreviewCanvas draw={sim.drawPreview} color={sim.color} />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />
                    </div>
                    <div className="p-3 bg-navy-900">
                      <h3 className="text-base font-semibold mb-0.5" style={{ color: sim.color }}>
                        {sim.title}
                      </h3>
                      <p className="text-navy-400 text-xs leading-relaxed">{sim.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
