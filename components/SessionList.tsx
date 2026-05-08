'use client'
import { useState } from 'react'
import { SessionRow } from './SessionRow'
import type { Session } from '@/lib/types'

type Tab = 'today' | 'week' | 'month' | 'custom' | 'unpaid'

const TZ = 'Asia/Jerusalem'

function israelOffset(): number {
  const noonUTC = new Date()
  noonUTC.setUTCHours(12, 0, 0, 0)
  return (
    parseInt(
      new Intl.DateTimeFormat('en', { timeZone: TZ, hour: 'numeric', hour12: false }).format(noonUTC),
      10
    ) - 12
  )
}

function dateToUTC(dateStr: string, offset: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCHours(d.getUTCHours() - offset)
  return d.toISOString()
}

function getWeekRange(): { start: string; end: string } {
  const offset = israelOffset()
  const todayStr = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const d = new Date(todayStr)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - d.getDay())
  const nextSunday = new Date(sunday)
  nextSunday.setDate(sunday.getDate() + 7)
  return {
    start: dateToUTC(sunday.toISOString().split('T')[0], offset),
    end: dateToUTC(nextSunday.toISOString().split('T')[0], offset),
  }
}

function getMonthRange(): { start: string; end: string } {
  const offset = israelOffset()
  const todayStr = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const [year, month] = todayStr.split('-').map(Number)
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
  return {
    start: dateToUTC(firstDay, offset),
    end: dateToUTC(nextMonth, offset),
  }
}

interface Props {
  todaySessions: Session[]
  unpaidSessions: Session[]
  onSessionTap: (session: Session) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'היום' },
  { key: 'week', label: 'השבוע' },
  { key: 'month', label: 'החודש' },
  { key: 'custom', label: 'תאריך' },
  { key: 'unpaid', label: 'לא שולם' },
]

export function SessionList({ todaySessions, unpaidSessions, onSessionTap }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const [rangeSessions, setRangeSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  async function fetchRange(start: string, end: string) {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/sessions/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      )
      if (res.ok) setRangeSessions(await res.json())
    } finally {
      setLoading(false)
    }
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'week') {
      const { start, end } = getWeekRange()
      fetchRange(start, end)
    } else if (t === 'month') {
      const { start, end } = getMonthRange()
      fetchRange(start, end)
    } else if (t === 'custom') {
      setRangeSessions([])
    }
  }

  function handleCustomSearch() {
    if (!customStart || !customEnd) return
    const offset = israelOffset()
    const endDate = new Date(customEnd)
    endDate.setDate(endDate.getDate() + 1)
    const endStr = endDate.toISOString().split('T')[0]
    fetchRange(dateToUTC(customStart, offset), dateToUTC(endStr, offset))
  }

  const sessions =
    tab === 'today' ? todaySessions : tab === 'unpaid' ? unpaidSessions : rangeSessions

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              tab === key ? 'bg-blue-600 text-white' : 'bg-card-hover text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'custom' && (
        <div className="flex gap-2 mb-3 items-center flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-card-hover text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700"
          />
          <span className="text-gray-500 text-sm">—</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-card-hover text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700"
          />
          <button
            onClick={handleCustomSearch}
            disabled={!customStart || !customEnd || loading}
            className={`px-4 py-1.5 rounded-lg text-sm bg-blue-600 text-white disabled:opacity-50 ${loading ? 'btn-loading' : ''}`}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="spinner spinner--sm" />
                מחפש...
              </span>
            ) : (
              'חפש'
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">אין פגישות להצגה</p>
      ) : (
        sessions.map((s) => <SessionRow key={s.id} session={s} onTap={onSessionTap} />)
      )}
    </div>
  )
}
