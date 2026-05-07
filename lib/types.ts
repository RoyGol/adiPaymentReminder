export interface Patient {
  id: string
  user_id: string
  name: string
  default_rate: number
  ignored: boolean
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  patient_id: string | null
  calendar_event_id: string
  start_time: string
  paid: boolean
  amount: number
  paid_date: string | null
  created_at: string
  patient?: Patient
}

export interface SyncLog {
  id: string
  user_id: string
  synced_at: string
  events_fetched: number
}

export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
}

export interface PatientWithStats extends Patient {
  total_debt: number
  total_paid: number
  session_count: number
}
