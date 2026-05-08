'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * A global top-of-screen loading bar (like YouTube / GitHub).
 * It starts when navigation begins and completes when the new page renders.
 */
export function NavigationLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const prevPathname = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Detect when pathname actually changes → complete the bar
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      // Navigation completed
      setProgress(100)
      if (timerRef.current) clearInterval(timerRef.current)
      const timeout = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  // Listen for click events on links / nav buttons to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]')
      const navButton = target.closest('[data-nav-href]')

      const href = anchor?.getAttribute('href') ?? navButton?.getAttribute('data-nav-href')

      if (!href) return
      // Skip external links, hash links, same page
      if (href.startsWith('http') || href.startsWith('#')) return
      if (href === pathname) return

      // Start the loading bar
      setLoading(true)
      setProgress(15)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          // Slow down as it approaches 90% — never reaches 100 until navigation completes
          if (prev >= 90) return prev
          const increment = prev < 50 ? 8 : prev < 75 ? 3 : 1
          return Math.min(prev + increment, 90)
        })
      }, 200)
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div className="nav-loader-container">
      <div
        className="nav-loader-bar"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
