'use client'
import { useEffect, useState } from 'react'

interface Props {
  onNext: (unknownNames: string[]) => void
}

export function StepSync({ onNext }: Props) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/calendar/sync', { method: 'POST' })
      .then((r) => r.json())
      .then((data: { synced: number; unknownNames: string[] }) => {
        setCount(data.synced)
        setTimeout(() => onNext(data.unknownNames), 800)
      })
  }, [onNext])

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
