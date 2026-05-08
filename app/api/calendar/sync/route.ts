import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRecentEvents, matchEventsToPatients, extractUnknownNames } from '@/lib/google-calendar'
import { getPatientNames, getIgnoredNames } from '@/lib/db/patients'
import { upsertSession } from '@/lib/db/sessions'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Use getUser() — validates JWT against auth server (getSession() is unverified)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const accessToken =
    body.provider_token ??
    user.user_metadata?.google_access_token ??
    null

  if (!accessToken) {
    return NextResponse.json(
      { error: 'No Google access token — please log out and log in again' },
      { status: 400 }
    )
  }

  const [knownNames, ignoredNames] = await Promise.all([
    getPatientNames(supabase),
    getIgnoredNames(supabase),
  ])

  const events = await fetchRecentEvents(accessToken)
  const { matched } = matchEventsToPatients(events, knownNames)
  const unknownNames = extractUnknownNames(events, knownNames, ignoredNames)

  // Fetch all patients with id, name, default_rate in one query (no N+1)
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, default_rate')
    .eq('ignored', false)

  const patientMap = new Map(
    (patients ?? []).map((p: { id: string; name: string; default_rate: number }) => [
      p.name,
      { id: p.id, default_rate: p.default_rate },
    ])
  )

  for (const event of matched) {
    const patient = patientMap.get(event.summary)
    if (!patient) continue
    await upsertSession(supabase, {
      user_id: user.id,
      calendar_event_id: event.id,
      patient_id: patient.id,
      start_time: event.start.dateTime,
      amount: patient.default_rate,
    })
  }

  await supabase
    .from('sync_log')
    .insert({ user_id: user.id, events_fetched: events.length })

  return NextResponse.json({ synced: matched.length, unknownNames })
}
