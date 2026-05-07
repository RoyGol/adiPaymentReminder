// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { getSessionStats } from '@/lib/db/sessions'

describe('getSessionStats', () => {
  it('calculates totalDebt, todayCount, unpaidCount from session data', async () => {
    const today = new Date()
    const todayISO = today.toISOString()

    const unpaidSessions = [
      { amount: 150, start_time: todayISO },
      { amount: 200, start_time: todayISO },
      { amount: 300, start_time: new Date('2026-04-01').toISOString() },
    ]
    const todaySessions = [{ id: '1' }, { id: '2' }]

    const mock = { from: vi.fn() }
    let callCount = 0
    mock.from.mockImplementation(() => {
      callCount++
      const data = callCount === 1 ? unpaidSessions : todaySessions
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data, error: null }),
      }
    })

    const result = await getSessionStats(mock as any)
    expect(result.totalDebt).toBe(650)
    expect(result.unpaidCount).toBe(3)
    expect(result.todayCount).toBe(2)
  })
})
