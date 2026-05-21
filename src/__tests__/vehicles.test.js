// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../supabase'
import { getVehicleByPlate, createVehicle, updateVehicleMileage } from '../db/vehicles'

beforeEach(() => { vi.clearAllMocks() })

describe('getVehicleByPlate', () => {
  it('normalises plate to uppercase before query', async () => {
    const row = { vehicle_id: 'uuid-1', plate_number: 'WA1234X' }
    const eqMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: row, error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      single: singleMock,
    })
    await getVehicleByPlate('wa1234x')
    expect(eqMock).toHaveBeenCalledWith('plate_number', 'WA1234X')
  })

  it('throws on not found', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found', code: 'PGRST116' } }),
    })
    await expect(getVehicleByPlate('XX9999')).rejects.toMatchObject({ message: 'not found' })
  })
})

describe('createVehicle', () => {
  it('inserts a valid vehicle with normalised plate', async () => {
    const row = { vehicle_id: 'uuid-1', plate_number: 'WA1234X' }
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })
    const result = await createVehicle({ plate_number: 'wa1234x', customer_id: '00000000-0000-0000-0000-000000000001' })
    expect(result).toEqual(row)
  })

  it('throws ZodError when plate_number is missing', async () => {
    await expect(createVehicle({ customer_id: '00000000-0000-0000-0000-000000000001' })).rejects.toThrow()
  })

  it('throws ZodError when customer_id is not a UUID', async () => {
    await expect(createVehicle({ plate_number: 'WA1234', customer_id: 'not-a-uuid' })).rejects.toThrow()
  })
})

describe('updateVehicleMileage', () => {
  it('updates mileage and sets today as last_mileage_date', async () => {
    const updateMock = vi.fn().mockReturnThis()
    supabase.from.mockReturnValue({
      update: updateMock,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { last_mileage_km: 50000 }, error: null }),
    })
    const result = await updateVehicleMileage('uuid-1', 50000)
    expect(result).toMatchObject({ last_mileage_km: 50000 })
    const updateArg = updateMock.mock.calls[0][0]
    expect(updateArg.last_mileage_km).toBe(50000)
    expect(updateArg.last_mileage_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
