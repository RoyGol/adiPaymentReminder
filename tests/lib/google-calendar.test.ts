// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { matchEventsToPatients, extractUnknownNames } from '@/lib/google-calendar'
import type { CalendarEvent } from '@/lib/types'

const events: CalendarEvent[] = [
  { id: 'e1', summary: 'שרה כהן', start: { dateTime: '2026-05-06T10:00:00Z' } },
  { id: 'e2', summary: 'דני לוי', start: { dateTime: '2026-05-06T11:00:00Z' } },
  { id: 'e3', summary: 'ישיבת צוות', start: { dateTime: '2026-05-06T12:00:00Z' } },
]

describe('matchEventsToPatients', () => {
  it('returns matched events for known patient names', () => {
    const knownNames = new Set(['שרה כהן', 'דני לוי'])
    const { matched } = matchEventsToPatients(events, knownNames)
    expect(matched).toHaveLength(2)
    expect(matched.map((e) => e.summary)).toEqual(['שרה כהן', 'דני לוי'])
  })

  it('returns unmatched events for unknown names', () => {
    const knownNames = new Set(['שרה כהן'])
    const { unmatched } = matchEventsToPatients(events, knownNames)
    expect(unmatched).toHaveLength(2)
  })

  it('matching is exact and case-sensitive', () => {
    const knownNames = new Set(['שרה כהן '])  // trailing space
    const { matched } = matchEventsToPatients(events, knownNames)
    expect(matched).toHaveLength(0)
  })
})

describe('extractUnknownNames', () => {
  it('returns unique unknown names not in ignored or known sets', () => {
    const knownNames = new Set(['שרה כהן'])
    const ignoredNames = new Set(['ישיבת צוות'])
    const names = extractUnknownNames(events, knownNames, ignoredNames)
    expect(names).toEqual(['דני לוי'])
  })

  it('deduplicates names across multiple events', () => {
    const repeated: CalendarEvent[] = [
      ...events,
      { id: 'e4', summary: 'דני לוי', start: { dateTime: '2026-05-07T11:00:00Z' } },
    ]
    const names = extractUnknownNames(repeated, new Set(), new Set())
    expect(names.filter((n) => n === 'דני לוי')).toHaveLength(1)
  })
})
