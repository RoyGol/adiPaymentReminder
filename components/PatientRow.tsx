'use client'
import type { PatientWithStats } from '@/lib/types'

interface Props {
  patient: PatientWithStats
  onClick: (id: string) => void
}

export function PatientRow({ patient, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(patient.id)}
      className="w-full bg-card rounded-lg px-3 py-2.5 mb-1.5 flex justify-between items-center text-right row-interactive"
    >
      <div className="text-left">
        {patient.total_debt > 0 ? (
          <span className="text-red-400 text-sm font-bold">₪{patient.total_debt}</span>
        ) : (
          <span className="text-green-400 text-sm font-bold">שילם ✓</span>
        )}
        <div className="text-gray-500 text-xs mt-0.5">{patient.session_count} פגישות</div>
      </div>
      <div>
        <div className="text-white text-sm">{patient.name}</div>
        <div className="text-gray-400 text-xs mt-0.5">
          <span>₪{patient.default_rate}</span>
          <span> לפגישה</span>
        </div>
      </div>
    </button>
  )
}
