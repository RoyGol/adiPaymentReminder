import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markSessionPaid, unmarkSessionPaid } from '@/lib/db/sessions'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (body.paid === false) {
    const session = await unmarkSessionPaid(supabase, id)
    return NextResponse.json(session)
  }

  const { amount, paid_date } = body
  if (typeof amount !== 'number' || !paid_date) {
    return NextResponse.json({ error: 'amount and paid_date required' }, { status: 400 })
  }

  const session = await markSessionPaid(supabase, id, amount, paid_date)
  return NextResponse.json(session)
}
