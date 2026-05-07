import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRecentEvents, matchEventsToPatients, extractUnknownNames } from '@/lib/google-calendar'
import { getPatientNames, getIgnoredNames } from '@/lib/db/patients'
import { upsertSession } from '@/lib/db/sessions'

export async function POST() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = session.provider_token
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token' }, { status: 400 })
  }

  const [knownNames, ignoredNames] = await Promise.all([
    getPatientNames(supabase),
    getIgnoredNames(supabase),
  ])

  const events = await fetchRecentEvents(accessToken)
  const { matched } = matchEventsToPatients(events, knownNames)
  const unknownNames = extractUnknownNames(events, knownNames, ignoredNames)

  const { data: patients } = await supabase
    .from('patients')
    .select('id, name')
    .eq('ignored', false)

  const patientMap = new Map(
    (patients ?? []).map((p: { id: string; name: string }) => [p.name, p.id])
  )

  for (const event of matched) {
    const patientId = patientMap.get(event.summary)
    if (!patientId) continue
    const { data: patient } = await supabase
      .from('patients')
      .select('default_rate')
      .eq('id', patientId)
      .single()
    await upsertSession(supabase, {
      user_id: session.user.id,
      calendar_event_id: event.id,
      patient_id: patientId,
      start_time: event.start.dateTime,
      amount: patient?.default_rate ?? 0,
    })
  }

  await supabase.from('sync_log').insert({ user_id: session.user.id, events_fetched: events.length })

  return NextResponse.json({ synced: matched.length, unknownNames })
}
