'use client'
import { useEffect, useState, useCallback } from 'react'

interface Props {
  onNext: (unknownNames: string[]) => void
}

export function StepSync({ onNext }: Props) {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSync = useCallback(() => {
    setError(null)
    setCount(null)
    fetch('/api/calendar/sync', { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error(`Sync failed: ${r.status}`)
        return r.json()
      })
      .then((data: { synced: number; unknownNames: string[] }) => {
        setCount(data.synced)
        setTimeout(() => onNext(data.unknownNames), 800)
      })
      .catch((err: Error) => {
        setError(err.message || 'שגיאה בסנכרון היומן')
      })
  }, [onNext])

  useEffect(() => {
    runSync()
  }, [runSync])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-4xl mb-5">⚠️</div>
        <h2 className="text-white text-lg font-bold mb-2">שגיאה בסנכרון</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">{error}</p>
        <button
          onClick={runSync}
          className="bg-blue-600 text-white rounded-xl px-6 py-3 font-medium"
        >
          נסה שוב
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-4xl mb-5">⏳</div>
      <h2 className="text-white text-lg font-bold mb-2">טוען פגישות...</h2>
      <p className="text-gray-400 text-sm mb-6">מושך פגישות מ־30 הימים האחרונים</p>
      {count !== null && (
        <div className="bg-card rounded-lg px-5 py-3 text-blue-300 text-sm">
          נמצאו {count} פגישות
        </div>
      )}
    </div>
  )
}
