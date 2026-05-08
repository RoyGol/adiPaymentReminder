import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Store Google token in user metadata while it's available
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          await supabase.auth.updateUser({
            data: {
              google_access_token: session.provider_token,
              google_token_saved_at: Date.now(),
            },
          })
        }

        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })

        if (count === 0) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
        return NextResponse.redirect(`${origin}/sessions`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
