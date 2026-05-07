// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPatients,
  createPatient,
  updatePatientRate,
  ignorePatientName,
  getPatientNames,
  getIgnoredNames,
} from '@/lib/db/patients'

function makeMockSupabase(returnData: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error }),
    then: undefined as unknown,
  }
  chain.order = vi.fn().mockResolvedValue({ data: returnData, error })
  return { from: vi.fn().mockReturnValue(chain), _chain: chain }
}

describe('getPatients', () => {
  it('returns non-ignored patients ordered by name', async () => {
    const patients = [{ id: '1', name: 'שרה כהן', default_rate: 150, ignored: false }]
    const { from, _chain } = makeMockSupabase(patients)
    const result = await getPatients({ from } as any)
    expect(result).toEqual(patients)
    expect(_chain.eq).toHaveBeenCalledWith('ignored', false)
  })
})

describe('createPatient', () => {
  it('inserts patient and returns it', async () => {
    const patient = { id: '1', name: 'שרה כהן', default_rate: 150 }
    const mock = { from: vi.fn() }
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: patient, error: null }),
    }
    mock.from.mockReturnValue(chain)
    const result = await createPatient(mock as any, 'שרה כהן', 150)
    expect(result).toEqual(patient)
    expect(chain.insert).toHaveBeenCalledWith({ name: 'שרה כהן', default_rate: 150 })
  })
})

describe('getPatientNames', () => {
  it('returns a Set of patient names', async () => {
    const mock = { from: vi.fn() }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ name: 'שרה כהן' }, { name: 'דני לוי' }], error: null }),
    }
    mock.from.mockReturnValue(chain)
    const result = await getPatientNames(mock as any)
    expect(result).toEqual(new Set(['שרה כהן', 'דני לוי']))
  })
})
