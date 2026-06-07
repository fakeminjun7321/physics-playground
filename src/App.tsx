import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import HubPage from './pages/HubPage'

const DoublePendulumPage = lazy(() => import('./pages/DoublePendulumPage'))
const ThreeBodyPage = lazy(() => import('./pages/ThreeBodyPage'))
const CoupledOscPage = lazy(() => import('./pages/CoupledOscPage'))
const EMWavePage = lazy(() => import('./pages/EMWavePage'))
const ChargedParticlePage = lazy(() => import('./pages/ChargedParticlePage'))
const RLCPage = lazy(() => import('./pages/RLCPage'))
const EMInductionPage = lazy(() => import('./pages/EMInductionPage'))
const WavePage = lazy(() => import('./pages/WavePage'))
const BlackbodyPage = lazy(() => import('./pages/BlackbodyPage'))
const LorentzPage = lazy(() => import('./pages/LorentzPage'))
const LengthContractionPage = lazy(() => import('./pages/LengthContractionPage'))
const RelDopplerPage = lazy(() => import('./pages/RelDopplerPage'))
const QuantumTunnelPage = lazy(() => import('./pages/QuantumTunnelPage'))
const HydrogenOrbitalPage = lazy(() => import('./pages/HydrogenOrbitalPage'))
const PhotoelectricPage = lazy(() => import('./pages/PhotoelectricPage'))

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-navy-950">
      <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/double-pendulum" element={<DoublePendulumPage />} />
        <Route path="/three-body" element={<ThreeBodyPage />} />
        <Route path="/coupled-oscillators" element={<CoupledOscPage />} />
        <Route path="/em-wave" element={<EMWavePage />} />
        <Route path="/charged-particle" element={<ChargedParticlePage />} />
        <Route path="/rlc-circuit" element={<RLCPage />} />
        <Route path="/em-induction" element={<EMInductionPage />} />
        <Route path="/wave" element={<WavePage />} />
        <Route path="/blackbody" element={<BlackbodyPage />} />
        <Route path="/lorentz" element={<LorentzPage />} />
        <Route path="/length-contraction" element={<LengthContractionPage />} />
        <Route path="/rel-doppler" element={<RelDopplerPage />} />
        <Route path="/quantum-tunnel" element={<QuantumTunnelPage />} />
        <Route path="/hydrogen-orbital" element={<HydrogenOrbitalPage />} />
        <Route path="/photoelectric" element={<PhotoelectricPage />} />
      </Routes>
    </Suspense>
  )
}
