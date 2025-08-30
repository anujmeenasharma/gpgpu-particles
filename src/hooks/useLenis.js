import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

const useLenis = (options = {}) => {
  const lenisRef = useRef(null)
  
  useEffect(() => {
    // Default options for Lenis
    const defaultOptions = {
      duration: 2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
      ...options
    }

    // Initialize Lenis
    lenisRef.current = new Lenis(defaultOptions)

    // Animation loop
    const raf = (time) => {
      lenisRef.current?.raf(time)
      requestAnimationFrame(raf)
    }

    // Start the animation loop
    requestAnimationFrame(raf)

    // Cleanup function
    return () => {
      if (lenisRef.current) {
        lenisRef.current.destroy()
      }
    }
  }, [])

  // Return the Lenis instance for advanced usage
  return lenisRef.current
}

export default useLenis
