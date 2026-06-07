import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  color: string
  children: ReactNode
  controls: ReactNode
}

export default function SimulationLayout({ title, color, children, controls }: Props) {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 bg-navy-900 border-b border-navy-800">
        <Link
          to="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <h1 className="text-lg font-semibold" style={{ color }}>{title}</h1>
      </header>
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 relative min-h-[300px]">
          {children}
        </div>
        <aside className="w-full lg:w-80 bg-navy-900 border-t lg:border-t-0 lg:border-l border-navy-800 p-4 overflow-y-auto max-h-[40vh] lg:max-h-none">
          {controls}
        </aside>
      </div>
    </div>
  )
}
