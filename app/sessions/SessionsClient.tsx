'use client'
import { useState } from 'react'
import { SessionList } from '@/components/SessionList'
import { PaymentSheet } from '@/components/PaymentSheet'
import { LinkPatientsSheet } from '@/components/LinkPatientsSheet'
import type { Session } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  todaySessions: Session[]
  unpaidSessions: Session[]
}

export function SessionsClient({ todaySessions, unpaidSessions }: Props) {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [unknownNames, setUnknownNames] = useState<string[] | null>(null)
  const router = useRouter()

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.unknownNames?.length > 0) {
        setUnknownNames(data.unknownNames)
      } else {
        router.refresh()
      }
    } finally {
      setSyncing(false)
    }
  }

  async function handleConfirmPayment(sessionId: string, amount: number, date: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paid_date: date }),
    })
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          <span className={syncing ? 'animate-spin' : ''}>🔄</span>
          {syncing ? 'מסנכרן...' : 'סנכרן יומן'}
        </button>
      </div>
      <SessionList
        todaySessions={todaySessions}
        unpaidSessions={unpaidSessions}
        onSessionTap={setActiveSession}
      />
      <PaymentSheet
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onConfirm={handleConfirmPayment}
      />
      {unknownNames && (
        <LinkPatientsSheet
          unknownNames={unknownNames}
          onClose={() => setUnknownNames(null)}
          onDone={() => {
            setUnknownNames(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
