'use client'
import { useState } from 'react'

interface NameEntry {
  name: string
  rate: string
  dismissed: boolean
}

interface Props {
  unknownNames: string[]
  onClose: () => void
  onDone: () => void
}

export function LinkPatientsSheet({ unknownNames, onClose, onDone }: Props) {
  const [entries, setEntries] = useState<NameEntry[]>(
    unknownNames.map((name) => ({ name, rate: '', dismissed: false }))
  )
  const [saving, setSaving] = useState(false)

  function toggleDismiss(index: number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, dismissed: !e.dismissed } : e))
    )
  }

  function setRate(index: number, rate: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, rate } : e))
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const results = await Promise.allSettled(
        entries.map((entry) =>
          fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: entry.name,
              default_rate: entry.dismissed ? 0 : Number(entry.rate) || 0,
              ignored: entry.dismissed,
            }),
          }).then((r) => {
            if (!r.ok) throw new Error(`Failed to save ${entry.name}`)
            return r.json()
          })
        )
      )
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        alert(`שגיאה: ${failed.length} מטופלים לא נשמרו. נסי שוב.`)
        setSaving(false)
        return
      }
      onDone()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl border-t border-gray-700 max-h-[85vh] overflow-y-auto">
        <div className="p-5">
          <div className="w-8 h-0.5 bg-gray-600 rounded mx-auto mb-4" />
          <h3 className="text-white font-bold text-base mb-1">שמות חדשים ביומן</h3>
          <p className="text-gray-400 text-sm mb-4">
            נמצאו {unknownNames.length} שמות חדשים — הגדירי מחיר או דחי
          </p>

          {entries.map((entry, i) =>
            entry.dismissed ? (
              <div key={entry.name} className="bg-card-hover border border-gray-700 rounded-xl p-3 mb-3 opacity-50">
                <div className="flex justify-between items-center">
                  <button onClick={() => toggleDismiss(i)} className="border border-gray-600 text-blue-400 rounded-lg px-3 py-1 text-xs">
                    בטל ↩
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm line-through">{entry.name}</span>
                    <span className="bg-gray-700 text-gray-500 rounded px-2 py-0.5 text-xs">לא מטופל</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={entry.name} className="bg-card-hover border border-blue-600/30 rounded-xl p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={() => toggleDismiss(i)} className="border border-gray-600 text-gray-500 rounded-lg px-3 py-1 text-xs">
                    לא מטופל ✕
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{entry.name}</span>
                    <span className="bg-blue-900/50 border border-blue-600/50 text-blue-300 rounded px-2 py-0.5 text-xs">חדש</span>
                  </div>
                </div>
                <input
                  type="number"
                  value={entry.rate}
                  onChange={(e) => setRate(i, e.target.value)}
                  placeholder="מחיר ברירת מחדל לפגישה (₪)"
                  className="w-full bg-card border border-gray-700 rounded-lg px-3 py-2 text-white text-right text-sm placeholder-gray-600"
                />
              </div>
            )
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full bg-blue-600 text-white rounded-xl py-3.5 font-medium mt-2 disabled:opacity-70 ${saving ? 'btn-loading' : ''}`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                שומר...
              </span>
            ) : (
              'שמירה ✓'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
