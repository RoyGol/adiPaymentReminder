import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPatientWithStats } from '@/lib/db/patients'
import { getPatientSessions } from '@/lib/db/sessions'
import { PatientDetailClient } from './PatientDetailClient'

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [patient, sessions] = await Promise.all([
    getPatientWithStats(supabase, id).catch(() => null),
    getPatientSessions(supabase, id),
  ])

  if (!patient) notFound()

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <PatientDetailClient patient={patient} sessions={sessions} />
    </main>
  )
}
