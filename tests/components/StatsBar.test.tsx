import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatsBar } from '@/components/StatsBar'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

describe('StatsBar', () => {
  it('displays all three stats', () => {
    render(<StatsBar totalDebt={750} todayCount={3} unpaidCount={2} />)
    expect(screen.getByText('₪750')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('clicking debt button navigates to patients filtered by חייבים', async () => {
    render(<StatsBar totalDebt={750} todayCount={3} unpaidCount={2} />)
    await userEvent.click(screen.getByText('₪750').closest('button')!)
    expect(mockPush).toHaveBeenCalledWith('/patients?filter=חייבים')
  })
})
