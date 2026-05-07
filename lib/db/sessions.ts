import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session } from '../types'

export async function getTodaySessions(supabase: SupabaseClient): Promise<Session[]> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const { data, error } = await supabase
    .from('sessions')
    .select('*, patient:patients(*)')
    .gte('start_time', start)
    .lt('start_time', end)
    .not('patient_id', 'is', null)
    .order('start_time')
  if (error) throw error
  return data
}

export async function getUnpaidSessions(supabase: SupabaseClient): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, patient:patients(*)')
    .eq('paid', false)
    .not('patient_id', 'is', null)
    .order('start_time', { ascending: false })
  if (error) throw error
  return data
}

export async function getPatientSessions(
  supabase: SupabaseClient,
  patientId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('patient_id', patientId)
    .order('start_time', { ascending: false })
  if (error) throw error
  return data
}

export async function markSessionPaid(
  supabase: SupabaseClient,
  id: string,
  amount: number,
  paidDate: string
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({ paid: true, amount, paid_date: paidDate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertSession(
  supabase: SupabaseClient,
  session: {
    user_id: string
    calendar_event_id: string
    patient_id: string
    start_time: string
    amount: number
  }
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .upsert(session, { onConflict: 'user_id,calendar_event_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function getSessionStats(supabase: SupabaseClient): Promise<{
  totalDebt: number
  todayCount: number
  unpaidCount: number
}> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [unpaidRes, todayRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('amount')
      .eq('paid', false)
      .not('patient_id', 'is', null)
      .gte('start_time', new Date(0).toISOString())
      .lt('start_time', end),
    supabase
      .from('sessions')
      .select('id')
      .not('patient_id', 'is', null)
      .gte('start_time', start)
      .lt('start_time', end),
  ])

  if (unpaidRes.error) throw unpaidRes.error
  if (todayRes.error) throw todayRes.error

  const unpaidData = unpaidRes.data ?? []
  const todayData = todayRes.data ?? []
  const totalDebt = unpaidData.reduce(
    (sum: number, s: { amount: number }) => sum + s.amount,
    0
  )

  return {
    totalDebt,
    unpaidCount: unpaidData.length,
    todayCount: todayData.length,
  }
}
