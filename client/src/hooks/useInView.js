import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Intersection Observer para animaciones on-scroll (p. ej. landing).
 * @param {object} [options]
 * @param {string} [options.rootMargin]
 * @param {number|number[]} [options.threshold]
 * @param {boolean} [options.once] — dejar de observar tras la primera intersección
 */
export function useInView(options = {}) {
  const { rootMargin = '0px 0px -8% 0px', threshold = 0, once = true } = options
  const [inView, setInView] = useState(false)
  const observerRef = useRef(null)

  const ref = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node) return

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          setInView(true)
          if (once && observerRef.current) {
            observerRef.current.disconnect()
            observerRef.current = null
          }
        },
        { root: null, rootMargin, threshold }
      )
      observerRef.current.observe(node)
    },
    [rootMargin, threshold, once]
  )

  useEffect(
    () => () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    },
    []
  )

  return [ref, inView]
}
