import { createClient } from '@/lib/supabase/server'
import { getPatients } from '@/lib/db/patients'
import { PatientList } from '@/components/PatientList'
import type { PatientWithStats } from '@/lib/types'

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient()
  const { filter } = await searchParams

  const patients = await getPatients(supabase)

  const patientIds = patients.map((p) => p.id)
  const { data: allSessions } = patientIds.length > 0
    ? await supabase
        .from('sessions')
        .select('patient_id, paid, amount')
        .in('patient_id', patientIds)
    : { data: [] }

  const sessionsByPatient = new Map<string, { paid: boolean; amount: number }[]>()
  for (const s of allSessions ?? []) {
    const arr = sessionsByPatient.get(s.patient_id) ?? []
    arr.push(s)
    sessionsByPatient.set(s.patient_id, arr)
  }

  const patientsWithStats: PatientWithStats[] = patients.map((p) => {
    const sessions = sessionsByPatient.get(p.id) ?? []
    return {
      ...p,
      total_debt: sessions.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0),
      total_paid: sessions.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0),
      session_count: sessions.length,
    }
  })

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <PatientList patients={patientsWithStats} initialFilter={filter ?? 'כולם'} />
    </main>
  )
}
