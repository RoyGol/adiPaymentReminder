'use client'
import { useState } from 'react'

interface Props {
  defaultRate: number
  onUpdate: (newRate: number) => Promise<void>
}

export function RateCard({ defaultRate, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultRate)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await onUpdate(value)
    setLoading(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-card-hover border border-blue-600/40 rounded-xl p-3 mb-4">
        <p className="text-gray-500 text-xs text-right mb-2">עריכת מחיר לפגישה</p>
        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="border border-gray-600 text-gray-400 rounded-lg px-3 py-1.5 text-xs"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs disabled:opacity-50"
            >
              שמירה
            </button>
          </div>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="bg-card border border-gray-600 rounded-lg px-3 py-1.5 text-white text-center w-24"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl p-3 mb-4 flex justify-between items-center">
      <button
        onClick={() => setEditing(true)}
        className="bg-blue-900/50 border border-blue-600/50 text-blue-300 rounded-lg px-3 py-1 text-xs"
      >
        עריכה ✎
      </button>
      <div className="text-right">
        <p className="text-gray-400 text-xs">מחיר ברירת מחדל לפגישה</p>
        <p className="text-white text-base font-bold">₪{defaultRate}</p>
      </div>
    </div>
  )
}
