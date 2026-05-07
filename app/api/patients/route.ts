import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPatients, createPatient, ignorePatientName } from '@/lib/db/patients'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patients = await getPatients(supabase)
  return NextResponse.json(patients)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, default_rate, ignored } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  if (ignored) {
    await ignorePatientName(supabase, name)
    return NextResponse.json({ ignored: true })
  }

  const patient = await createPatient(supabase, name, default_rate ?? 0)
  return NextResponse.json(patient)
}
