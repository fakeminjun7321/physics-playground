export interface Charge {
  id: number
  x: number
  y: number
  q: number // in μC
}

const K = 8.99e9 // Coulomb constant

export function electricField(
  x: number,
  y: number,
  charges: Charge[],
): { ex: number; ey: number } {
  let ex = 0
  let ey = 0

  for (const c of charges) {
    const dx = x - c.x
    const dy = y - c.y
    const r2 = dx * dx + dy * dy
    if (r2 < 100) continue // prevent singularity
    const r = Math.sqrt(r2)
    const q = c.q * 1e-6 // μC to C
    const E = K * q / r2
    ex += E * dx / r
    ey += E * dy / r
  }

  return { ex, ey }
}

export function potential(
  x: number,
  y: number,
  charges: Charge[],
): number {
  let v = 0
  for (const c of charges) {
    const dx = x - c.x
    const dy = y - c.y
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < 5) continue
    const q = c.q * 1e-6
    v += K * q / r
  }
  return v
}

export function traceFieldLine(
  startX: number,
  startY: number,
  charges: Charge[],
  w: number,
  h: number,
  direction: 1 | -1 = 1,
  maxSteps = 500,
  stepSize = 3,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  let x = startX
  let y = startY

  for (let i = 0; i < maxSteps; i++) {
    points.push({ x, y })
    const { ex, ey } = electricField(x, y, charges)
    const mag = Math.sqrt(ex * ex + ey * ey)
    if (mag < 1e-6) break

    x += direction * (ex / mag) * stepSize
    y += direction * (ey / mag) * stepSize

    if (x < -10 || x > w + 10 || y < -10 || y > h + 10) break

    // Stop near negative charges (sinks)
    for (const c of charges) {
      const dx = x - c.x
      const dy = y - c.y
      if (dx * dx + dy * dy < 100 && c.q * direction < 0) {
        points.push({ x: c.x, y: c.y })
        return points
      }
    }
  }

  return points
}
