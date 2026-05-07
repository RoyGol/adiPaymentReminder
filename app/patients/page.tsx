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

  const patientsWithStats: PatientWithStats[] = await Promise.all(
    patients.map(async (p) => {
      const sessionsRes = await supabase
        .from('sessions')
        .select('paid, amount')
        .eq('patient_id', p.id)
      const sessions: { paid: boolean; amount: number }[] = sessionsRes.data ?? []
      return {
        ...p,
        total_debt: sessions.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0),
        total_paid: sessions.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0),
        session_count: sessions.length,
      }
    })
  )

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <PatientList patients={patientsWithStats} initialFilter={filter ?? 'כולם'} />
    </main>
  )
}
