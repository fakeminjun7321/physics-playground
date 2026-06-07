// Convert wavelength (nm) to approximate RGB color
export function wavelengthToColor(nm: number): string {
  let r = 0, g = 0, b = 0

  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / (440 - 380)
    b = 1
  } else if (nm >= 440 && nm < 490) {
    g = (nm - 440) / (490 - 440)
    b = 1
  } else if (nm >= 490 && nm < 510) {
    g = 1
    b = -(nm - 510) / (510 - 490)
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / (580 - 510)
    g = 1
  } else if (nm >= 580 && nm < 645) {
    r = 1
    g = -(nm - 645) / (645 - 580)
  } else if (nm >= 645 && nm <= 700) {
    r = 1
  }

  // Intensity falloff at edges
  let factor: number
  if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / (420 - 380)
  else if (nm >= 645 && nm <= 700) factor = 0.3 + 0.7 * (700 - nm) / (700 - 645)
  else factor = 1

  return `rgb(${Math.round(r * factor * 255)}, ${Math.round(g * factor * 255)}, ${Math.round(b * factor * 255)})`
}

// Multi-slit intensity: I(θ) = I0 * [sin(N*δ/2)/sin(δ/2)]² * [sinc(π*a*sinθ/λ)]²
export function intensity(
  sinTheta: number,
  wavelength: number, // in meters
  slitWidth: number,  // in meters
  slitSpacing: number, // in meters
  numSlits: number,
): number {
  // Single-slit diffraction envelope
  const beta = Math.PI * slitWidth * sinTheta / wavelength
  const singleSlit = beta === 0 ? 1 : Math.sin(beta) / beta

  // Multi-slit interference
  const delta = Math.PI * slitSpacing * sinTheta / wavelength
  let multiSlit: number
  if (numSlits <= 1) {
    multiSlit = 1
  } else {
    const denom = Math.sin(delta)
    if (Math.abs(denom) < 1e-10) {
      multiSlit = numSlits
    } else {
      multiSlit = Math.sin(numSlits * delta) / denom
    }
  }

  return (singleSlit * singleSlit) * (multiSlit * multiSlit) / (numSlits * numSlits)
}
