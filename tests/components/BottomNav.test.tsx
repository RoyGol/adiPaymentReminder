import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/sessions',
}))

describe('BottomNav', () => {
  it('renders both tabs', () => {
    render(<BottomNav />)
    expect(screen.getByText('פגישות')).toBeInTheDocument()
    expect(screen.getByText('מטופלים')).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    render(<BottomNav />)
    const sessionsLink = screen.getByText('פגישות').closest('a')
    expect(sessionsLink).toHaveClass('text-blue-400')
  })
})
