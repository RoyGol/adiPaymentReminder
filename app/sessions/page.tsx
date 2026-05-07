import { createClient } from '@/lib/supabase/server'
import { getTodaySessions, getUnpaidSessions, getSessionStats } from '@/lib/db/sessions'
import { StatsBar } from '@/components/StatsBar'
import { SessionsClient } from './SessionsClient'

export default async function SessionsPage() {
  const supabase = await createClient()
  const [todaySessions, unpaidSessions, stats] = await Promise.all([
    getTodaySessions(supabase),
    getUnpaidSessions(supabase),
    getSessionStats(supabase),
  ])

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <StatsBar
        totalDebt={stats.totalDebt}
        todayCount={stats.todayCount}
        unpaidCount={stats.unpaidCount}
      />
      <SessionsClient
        todaySessions={todaySessions}
        unpaidSessions={unpaidSessions}
      />
    </main>
  )
}
