'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  if (pathname === '/login' || pathname === '/onboarding') return null

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around py-3 z-40">
      <Link
        href="/sessions"
        className={`flex flex-col items-center text-xs gap-0.5 ${
          pathname.startsWith('/sessions') ? 'text-blue-400' : 'text-gray-500'
        }`}
      >
        <span>📅</span>
        <span>פגישות</span>
      </Link>
      <Link
        href="/patients"
        className={`flex flex-col items-center text-xs gap-0.5 ${
          pathname.startsWith('/patients') ? 'text-blue-400' : 'text-gray-500'
        }`}
      >
        <span>👤</span>
        <span>מטופלים</span>
      </Link>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex flex-col items-center text-xs gap-0.5 text-gray-500 disabled:opacity-50"
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
