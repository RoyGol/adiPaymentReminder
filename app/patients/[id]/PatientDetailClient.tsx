'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { RateCard } from '@/components/RateCard'
import { PaymentSheet } from '@/components/PaymentSheet'
import type { PatientWithStats, Session } from '@/lib/types'

interface Props {
  patient: PatientWithStats
  sessions: Session[]
}

export function PatientDetailClient({ patient, sessions }: Props) {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const router = useRouter()

  async function handleRateUpdate(newRate: number) {
    await fetch(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_rate: newRate }),
    })
    router.refresh()
  }

  async function handleConfirmPayment(sessionId: string, amount: number, date: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paid_date: date }),
    })
    router.refresh()
  }

  async function handleUnmarkPaid(sessionId: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: false }),
    })
    router.refresh()
  }

  return (
    <>
      <button onClick={() => router.back()} className="text-blue-400 text-sm mb-3 block">
        ← חזרה
      </button>
      <h1 className="text-white text-xl font-bold mb-3">{patient.name}</h1>

      <RateCard
        defaultRate={patient.default_rate}
        onUpdate={handleRateUpdate}
      />

      <div className="flex gap-2 mb-5">
        {[
          { label: 'חוב נוכחי', value: `₪${patient.total_debt}`, color: 'text-red-400' },
          { label: 'שולם סה"כ', value: `₪${patient.total_paid}`, color: 'text-green-400' },
          { label: 'פגישות', value: String(patient.session_count), color: 'text-gray-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 bg-card rounded-xl p-3 text-center">
            <span className={`block text-base font-bold ${color}`}>{value}</span>
            <span className="block text-xs text-gray-400 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-gray-500 text-xs mb-2">היסטוריית פגישות</p>
      {sessions.map((s) => (
        <div
          key={s.id}
          className="w-full bg-card rounded-lg px-3 py-2.5 mb-1.5 flex justify-between items-center text-right"
        >
          <div className="flex items-center gap-2">
            {s.paid ? (
              <button
                onClick={() => handleUnmarkPaid(s.id)}
                className="text-gray-500 text-xs border border-gray-700 rounded px-2 py-0.5"
                title="בטל תשלום"
              >
                בטל
              </button>
            ) : (
              <button
                onClick={() => setActiveSession({ ...s, patient })}
                className="bg-red-900/40 text-red-400 border border-red-700/50 rounded-md px-2 py-1 text-xs font-bold"
              >
                ₪{s.amount}
              </button>
            )}
            {s.paid && (
              <span className="bg-green-900/40 text-green-400 border border-green-700/50 rounded-md px-2 py-1 text-xs font-bold">
                ₪{s.amount} ✓
              </span>
            )}
          </div>
          <div>
            <div className="text-white text-sm">
              {format(new Date(s.start_time), 'd בMMMM yyyy', { locale: he })}
            </div>
            <div className="text-gray-400 text-xs mt-0.5">
              {s.start_time.slice(11, 16)}
            </div>
          </div>
        </div>
      ))}

      <PaymentSheet
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onConfirm={handleConfirmPayment}
      />
    </>
  )
}
