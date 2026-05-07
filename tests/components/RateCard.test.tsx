import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateCard } from '@/components/RateCard'

describe('RateCard', () => {
  it('shows the current rate', () => {
    render(<RateCard patientId="1" defaultRate={150} onUpdate={vi.fn()} />)
    expect(screen.getByText('₪150')).toBeInTheDocument()
  })

  it('reveals edit input when עריכה is clicked', async () => {
    render(<RateCard patientId="1" defaultRate={150} onUpdate={vi.fn()} />)
    await userEvent.click(screen.getByText('עריכה ✎'))
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
    expect(screen.getByText('שמירה')).toBeInTheDocument()
  })

  it('calls onUpdate with new rate when saved', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<RateCard patientId="1" defaultRate={150} onUpdate={onUpdate} />)
    await userEvent.click(screen.getByText('עריכה ✎'))
    const input = screen.getByDisplayValue('150')
    await userEvent.clear(input)
    await userEvent.type(input, '200')
    await userEvent.click(screen.getByText('שמירה'))
    expect(onUpdate).toHaveBeenCalledWith(200)
  })
})
