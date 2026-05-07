import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingFlow } from '@/components/OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { count } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) redirect('/sessions')

  return <OnboardingFlow />
}
