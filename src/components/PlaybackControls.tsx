interface Props {
  playing: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
}

export default function PlaybackControls({ playing, onPlay, onPause, onReset }: Props) {
  return (
    <div className="flex gap-2">
      {playing ? (
        <button
          onClick={onPause}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors text-sm font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="4" height="12" rx="1"/>
            <rect x="8" y="1" width="4" height="12" rx="1"/>
          </svg>
          Pause
        </button>
      ) : (
        <button
          onClick={onPlay}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan transition-colors text-sm font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M3 1.5L12 7L3 12.5V1.5Z"/>
          </svg>
          Play
        </button>
      )}
      <button
        onClick={onReset}
        className="px-4 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 transition-colors text-sm font-medium"
      >
        Reset
      </button>
    </div>
  )
}
