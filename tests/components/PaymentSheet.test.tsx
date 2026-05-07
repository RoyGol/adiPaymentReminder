import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentSheet } from '@/components/PaymentSheet'
import type { Session } from '@/lib/types'

const session: Session = {
  id: '1', user_id: 'u1', patient_id: 'p1',
  calendar_event_id: 'ev1', start_time: '2026-05-06T10:00:00Z',
  paid: false, amount: 150, paid_date: null, created_at: '2026-01-01',
  patient: { id: 'p1', user_id: 'u1', name: 'שרה כהן', default_rate: 150, ignored: false, created_at: '2026-01-01' },
}

describe('PaymentSheet', () => {
  it('renders nothing when session is null', () => {
    const { container } = render(
      <PaymentSheet session={null} onClose={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows patient name and pre-filled amount', () => {
    render(<PaymentSheet session={session} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText(/שרה כהן/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
  })

  it('calls onConfirm with amount and date on submit', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<PaymentSheet session={session} onClose={vi.fn()} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByText('אישור תשלום ✓'))
    expect(onConfirm).toHaveBeenCalledWith('1', 150, expect.stringMatching(/\d{4}-\d{2}-\d{2}/))
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<PaymentSheet session={session} onClose={onClose} onConfirm={vi.fn()} />)
    const backdrop = document.querySelector('.absolute.inset-0')!
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
