import { useRef, useEffect, useCallback } from 'react'

export function useAnimation(
  callback: (dt: number) => void,
  running: boolean,
) {
  const rafRef = useRef<number>(0)
  const prevTimeRef = useRef<number>(0)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const loop = useCallback((time: number) => {
    if (prevTimeRef.current) {
      const dt = Math.min((time - prevTimeRef.current) / 1000, 0.05)
      callbackRef.current(dt)
    }
    prevTimeRef.current = time
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    if (running) {
      prevTimeRef.current = 0
      rafRef.current = requestAnimationFrame(loop)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [running, loop])
}
