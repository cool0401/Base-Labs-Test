import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)
  const savedDelay = useRef(delay)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    savedDelay.current = delay
  }, [delay])

  useEffect(() => {
    const tick = () => savedCallback.current()

    if (savedDelay.current === null) return

    const id = window.setInterval(tick, savedDelay.current)
    return () => window.clearInterval(id)
  }, [delay])
}
