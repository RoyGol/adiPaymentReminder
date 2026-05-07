import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePatientRate, getPatientWithStats } from '@/lib/db/patients'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const patient = await getPatientWithStats(supabase, id)
  return NextResponse.json(patient)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { default_rate } = await request.json()

  if (typeof default_rate !== 'number') {
    return NextResponse.json({ error: 'default_rate must be a number' }, { status: 400 })
  }

  const patient = await updatePatientRate(supabase, id, default_rate)
  return NextResponse.json(patient)
}
