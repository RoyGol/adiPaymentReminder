import { google } from 'googleapis'
import type { CalendarEvent } from './types'

export function createCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth })
}

export async function fetchRecentEvents(
  accessToken: string,
  since: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
): Promise<CalendarEvent[]> {
  const calendar = createCalendarClient(accessToken)
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: since.toISOString(),
    maxResults: 500,
    singleEvents: true,
    orderBy: 'startTime',
  })
  return (res.data.items ?? []).filter(
    (e): e is CalendarEvent =>
      !!(e.id && e.summary && e.start?.dateTime)
  )
}

export function matchEventsToPatients(
  events: CalendarEvent[],
  knownNames: Set<string>
): { matched: CalendarEvent[]; unmatched: CalendarEvent[] } {
  const matched: CalendarEvent[] = []
  const unmatched: CalendarEvent[] = []
  for (const event of events) {
    if (knownNames.has(event.summary)) {
      matched.push(event)
    } else {
      unmatched.push(event)
    }
  }
  return { matched, unmatched }
}

export function extractUnknownNames(
  events: CalendarEvent[],
  knownNames: Set<string>,
  ignoredNames: Set<string>
): string[] {
  const seen = new Set<string>()
  for (const event of events) {
    const name = event.summary
    if (!knownNames.has(name) && !ignoredNames.has(name)) {
      seen.add(name)
    }
  }
  return Array.from(seen)
}
