'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/login' || pathname === '/onboarding') return null

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
    </nav>
  )
}
