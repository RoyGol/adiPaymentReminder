import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientRow } from '@/components/PatientRow'
import type { PatientWithStats } from '@/lib/types'

const patient: PatientWithStats = {
  id: '1', user_id: 'u1', name: 'שרה כהן', default_rate: 150,
  ignored: false, created_at: '2026-01-01',
  total_debt: 300, total_paid: 900, session_count: 8,
}

describe('PatientRow', () => {
  it('shows name, rate, session count, and debt', () => {
    render(<PatientRow patient={patient} onClick={vi.fn()} />)
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
    expect(screen.getByText('₪150')).toBeInTheDocument()
    expect(screen.getByText('8 פגישות')).toBeInTheDocument()
    expect(screen.getByText('₪300')).toBeInTheDocument()
  })

  it('calls onClick when row is tapped', async () => {
    const onClick = vi.fn()
    render(<PatientRow patient={patient} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('1')
  })

  it('shows green text when no debt', () => {
    render(<PatientRow patient={{ ...patient, total_debt: 0 }} onClick={vi.fn()} />)
    expect(screen.getByText('שילם ✓')).toBeInTheDocument()
  })
})
