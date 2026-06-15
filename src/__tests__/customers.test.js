// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '../lib/supabase'
import { getCustomers, createCustomer, updateCustomer } from '../lib/db/customers'

beforeEach(() => { vi.clearAllMocks() })

describe('getCustomers', () => {
  it('returns active customers by default', async () => {
    const rows = [{ customer_id: 'uuid-1', company_name: 'ABC Sdn Bhd', status: 'active' }]
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })
    const result = await getCustomers()
    expect(result).toEqual(rows)
  })

  it('throws on Supabase error', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error', code: '500' } }),
    })
    await expect(getCustomers()).rejects.toMatchObject({ message: 'db error' })
  })
})

describe('createCustomer', () => {
  it('inserts a valid customer', async () => {
    const row = { customer_id: 'uuid-1', company_name: 'Test Sdn Bhd' }
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })
    const result = await createCustomer({ company_name: 'Test Sdn Bhd' })
    expect(result).toEqual(row)
  })

  it('throws ZodError when company_name is missing', async () => {
    await expect(createCustomer({})).rejects.toThrow()
  })

  it('throws ZodError when entity_type is invalid', async () => {
    await expect(createCustomer({ company_name: 'X', entity_type: 'invalid_type' })).rejects.toThrow()
  })
})

describe('updateCustomer', () => {
  it('updates with valid partial data', async () => {
    const row = { customer_id: 'uuid-1', company_name: 'Updated Sdn Bhd' }
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })
    const result = await updateCustomer('uuid-1', { company_name: 'Updated Sdn Bhd' })
    expect(result).toEqual(row)
  })

  it('strips unknown fields via Zod (does not throw, unknown keys are stripped)', async () => {
    supabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })
    await expect(updateCustomer('uuid-1', { company_name: 'X', injected_field: 'bad' })).resolves.toBeDefined()
  })
})
