import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export default function PhysicsInfo({ title, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-navy-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-navy-800/50 hover:bg-navy-800 transition-colors text-sm"
      >
        <span className="text-navy-300 font-medium">{title}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="px-3 py-3 text-sm text-navy-400 space-y-2 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

export function Eq({ children }: { children: string }) {
  return (
    <code className="block bg-navy-950 rounded px-2 py-1.5 text-neon-cyan font-mono text-xs my-1 overflow-x-auto">
      {children}
    </code>
  )
}
