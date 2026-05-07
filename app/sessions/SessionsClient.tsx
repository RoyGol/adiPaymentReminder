'use client'
import { useState } from 'react'
import { SessionList } from '@/components/SessionList'
import { PaymentSheet } from '@/components/PaymentSheet'
import type { Session } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  todaySessions: Session[]
  unpaidSessions: Session[]
}

export function SessionsClient({ todaySessions, unpaidSessions }: Props) {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const router = useRouter()

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
    </>
  )
}
