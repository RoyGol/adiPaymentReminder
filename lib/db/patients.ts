import type { SupabaseClient } from '@supabase/supabase-js'
import type { Patient, PatientWithStats } from '../types'

export async function getPatients(supabase: SupabaseClient): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('ignored', false)
    .order('name')
  if (error) throw error
  return data
}

export async function createPatient(
  supabase: SupabaseClient,
  name: string,
  defaultRate: number,
  userId: string
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert({ name, default_rate: defaultRate, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePatientRate(
  supabase: SupabaseClient,
  id: string,
  defaultRate: number
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update({ default_rate: defaultRate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function ignorePatientName(
  supabase: SupabaseClient,
  name: string,
  userId: string
): Promise<void> {
  // Try to update existing patient to ignored=true first
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('patients')
      .update({ ignored: true })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('patients')
      .insert({ name, user_id: userId, default_rate: 0, ignored: true })
    if (error) throw error
  }
}

export async function getPatientNames(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('patients')
    .select('name')
    .eq('ignored', false)
  if (error) throw error
  return new Set(data.map((p: { name: string }) => p.name))
}

export async function getIgnoredNames(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('patients')
    .select('name')
    .eq('ignored', true)
  if (error) throw error
  return new Set(data.map((p: { name: string }) => p.name))
}

export async function getPatientWithStats(
  supabase: SupabaseClient,
  id: string
): Promise<PatientWithStats> {
  const [patientRes, sessionsRes] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('sessions').select('paid, amount').eq('patient_id', id),
  ])
  if (patientRes.error) throw patientRes.error
  if (sessionsRes.error) throw sessionsRes.error

  const sessions: { paid: boolean; amount: number }[] = sessionsRes.data ?? []
  const total_debt = sessions.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0)
  const total_paid = sessions.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0)

  return {
    ...patientRes.data,
    total_debt,
    total_paid,
    session_count: sessions.length,
  }
}
