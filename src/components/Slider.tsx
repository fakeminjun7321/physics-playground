interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}

export default function Slider({ label, value, min, max, step, unit, onChange }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-navy-400">{label}</span>
        <span className="text-navy-200 font-mono">
          {value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}
          {unit && <span className="text-navy-500 ml-1">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}
