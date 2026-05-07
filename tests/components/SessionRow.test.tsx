import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionRow } from '@/components/SessionRow'
import type { Session } from '@/lib/types'

const session: Session = {
  id: '1', user_id: 'u1', patient_id: 'p1',
  calendar_event_id: 'ev1', start_time: '2026-05-06T10:00:00Z',
  paid: false, amount: 150, paid_date: null, created_at: '2026-01-01',
  patient: { id: 'p1', user_id: 'u1', name: 'שרה כהן', default_rate: 150, ignored: false, created_at: '2026-01-01' },
}

describe('SessionRow', () => {
  it('shows patient name, time, and unpaid amount', () => {
    render(<SessionRow session={session} onTap={vi.fn()} />)
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('₪150')).toBeInTheDocument()
  })

  it('calls onTap when clicked', async () => {
    const onTap = vi.fn()
    render(<SessionRow session={session} onTap={onTap} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledWith(session)
  })

  it('shows green checkmark badge for paid session', () => {
    const paid = { ...session, paid: true }
    render(<SessionRow session={paid} onTap={vi.fn()} />)
    expect(screen.getByText('₪150 ✓')).toBeInTheDocument()
  })
})
