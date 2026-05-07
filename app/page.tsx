import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  try {
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })

    if (count === 0) redirect('/onboarding')
  } catch {
    // DB error — fall through to sessions
  }

  redirect('/sessions')
}
