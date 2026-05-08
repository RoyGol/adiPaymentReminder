'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/sessions', icon: '📅', label: 'פגישות' },
  { href: '/patients', icon: '👤', label: 'מטופלים' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (pathname === '/login' || pathname === '/onboarding') return null

  // Clear pending state when navigation completes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isPending && pendingHref) {
      setPendingHref(null)
    }
  }, [isPending, pendingHref])

  function handleNavClick(href: string) {
    if (pathname.startsWith(href)) return // already on this page
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around py-3 z-40">
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const isActive = pathname.startsWith(href)
        const isLoading = pendingHref === href && isPending

        return (
          <button
            key={href}
            onClick={() => handleNavClick(href)}
            data-nav-href={href}
            className={`flex flex-col items-center text-xs gap-0.5 min-w-[48px] ${
              isActive ? 'text-blue-400' : 'text-gray-500'
            } ${isLoading ? 'nav-item-loading' : ''}`}
          >
            {isLoading ? (
              <span className="spinner spinner--sm spinner--blue" />
            ) : (
              <span>{icon}</span>
            )}
            <span>{label}</span>
          </button>
        )
      })}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex flex-col items-center text-xs gap-0.5 text-gray-500 disabled:opacity-50 min-w-[48px]"
      >
        {loggingOut ? (
          <>
            <span className="spinner spinner--sm spinner--blue" />
            <span>יוצא...</span>
          </>
        ) : (
          <>
            <span>🚪</span>
            <span>יציאה</span>
          </>
        )}
      </button>
    </nav>
  )
}
