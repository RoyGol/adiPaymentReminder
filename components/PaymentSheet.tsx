'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import type { Session } from '@/lib/types'

interface Props {
  session: Session | null
  onClose: () => void
  onConfirm: (sessionId: string, amount: number, date: string) => Promise<void>
}

export function PaymentSheet({ session, onClose, onConfirm }: Props) {
  const [amount, setAmount] = useState(() => session?.amount ?? 0)
  const [date, setDate] = useState(() =>
    session ? format(new Date(), 'yyyy-MM-dd') : ''
  )
  const [loading, setLoading] = useState(false)

  if (!session) return null

  async function handleConfirm() {
    setLoading(true)
    await onConfirm(session!.id, amount, date)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl p-5 border-t border-gray-700">
        <div className="w-8 h-0.5 bg-gray-600 rounded mx-auto mb-4" />
        <h3 className="text-white font-bold text-base mb-4 text-right">
          רישום תשלום — {session.patient?.name}
        </h3>
        <label className="text-gray-500 text-xs block mb-1 text-right">סכום (₪)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right mb-3"
        />
        <label className="text-gray-500 text-xs block mb-1 text-right">תאריך תשלום</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right mb-5"
        />
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`w-full bg-blue-600 text-white rounded-xl py-3.5 font-medium disabled:opacity-70 ${loading ? 'btn-loading' : ''}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" />
              שומר...
            </span>
          ) : (
            'אישור תשלום ✓'
          )}
        </button>
      </div>
    </div>
  )
}
