'use client'
import { useState } from 'react'
import { SessionRow } from './SessionRow'
import type { Session } from '@/lib/types'

type Tab = 'today' | 'unpaid'

interface Props {
  todaySessions: Session[]
  unpaidSessions: Session[]
  onSessionTap: (session: Session) => void
}

export function SessionList({ todaySessions, unpaidSessions, onSessionTap }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const sessions = tab === 'today' ? todaySessions : unpaidSessions

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['today', 'unpaid'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-card-hover text-gray-400'
            }`}
          >
            {t === 'today' ? 'היום' : 'לא שולם'}
          </button>
        ))}
      </div>
      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">אין פגישות להצגה</p>
      ) : (
        sessions.map((s) => (
          <SessionRow key={s.id} session={s} onTap={onSessionTap} />
        ))
      )}
    </div>
  )
}
