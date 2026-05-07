// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type { Patient, Session, CalendarEvent } from '@/lib/types'

describe('types', () => {
  it('Patient has required fields', () => {
    const p: Patient = {
      id: '1', user_id: 'u1', name: 'שרה כהן',
      default_rate: 150, ignored: false, created_at: '2026-01-01',
    }
    expect(p.name).toBe('שרה כהן')
  })

  it('Session has required fields', () => {
    const s: Session = {
      id: '1', user_id: 'u1', patient_id: 'p1',
      calendar_event_id: 'ev1', start_time: '2026-05-06T10:00:00Z',
      paid: false, amount: 150, paid_date: null, created_at: '2026-01-01',
    }
    expect(s.paid).toBe(false)
  })
})
