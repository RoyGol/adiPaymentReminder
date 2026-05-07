'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PatientRow } from './PatientRow'
import type { PatientWithStats } from '@/lib/types'

type Filter = 'כולם' | 'חייבים' | 'שילם'

interface Props {
  patients: PatientWithStats[]
  initialFilter?: string
}

export function PatientList({ patients, initialFilter = 'כולם' }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>(initialFilter as Filter)
  const router = useRouter()

  const filtered = patients.filter((p) => {
    const matchesSearch = p.name.includes(search)
    const matchesFilter =
      filter === 'כולם' ||
      (filter === 'חייבים' && p.total_debt > 0) ||
      (filter === 'שילם' && p.total_debt === 0)
    return matchesSearch && matchesFilter
  })

  const counts = {
    כולם: patients.length,
    חייבים: patients.filter((p) => p.total_debt > 0).length,
    שילם: patients.filter((p) => p.total_debt === 0).length,
  }

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 חיפוש מטופל..."
        className="w-full bg-card-hover border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right mb-3 placeholder-gray-600"
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['כולם', 'חייבים', 'שילם'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs ${
              filter === f
                ? 'bg-blue-600/30 border border-blue-500 text-blue-300'
                : 'bg-card-hover border border-gray-700 text-gray-400'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      {filtered.map((p) => (
        <PatientRow
          key={p.id}
          patient={p}
          onClick={(id) => router.push(`/patients/${id}`)}
        />
      ))}
    </div>
  )
}
