'use client'
import type { Session } from '@/lib/types'

interface Props {
  session: Session
  onTap: (session: Session) => void
}

export function SessionRow({ session, onTap }: Props) {
  // Extract HH:mm directly from the ISO string to avoid local timezone offset
  const time = session.start_time.slice(11, 16)

  return (
    <button
      onClick={() => onTap(session)}
      className="w-full bg-card rounded-lg px-3 py-2.5 mb-1.5 flex justify-between items-center text-right row-interactive"
    >
      <span
        className={`rounded-md px-2 py-1 text-xs font-bold ${
          session.paid
            ? 'bg-green-900/40 text-green-400 border border-green-700/50'
            : 'bg-red-900/40 text-red-400 border border-red-700/50'
        }`}
      >
        {session.paid ? `₪${session.amount} ✓` : `₪${session.amount}`}
      </span>
      <div>
        <div className="text-white text-sm">{session.patient?.name}</div>
        <div className="text-gray-400 text-xs mt-0.5">{time}</div>
      </div>
    </button>
  )
}
