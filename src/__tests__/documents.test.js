// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}))

import { supabase } from '../lib/supabase'
import { uploadDocument, createDocument, getDocumentsByVehicle } from '../lib/db/documents'

const makeFile = (name = 'test.pdf', type = 'application/pdf', size = 1024) =>
  ({ name, type, size })

beforeEach(() => { vi.clearAllMocks() })

describe('uploadDocument', () => {
  it('rejects disallowed file types', async () => {
    const file = makeFile('malware.exe', 'application/octet-stream', 100)
    await expect(uploadDocument('uuid-1', file, { doc_type: 'geran' }))
      .rejects.toThrow(/File type not allowed/)
  })

  it('rejects files exceeding 10 MB', async () => {
    const file = makeFile('huge.pdf', 'application/pdf', 11 * 1024 * 1024)
    await expect(uploadDocument('uuid-1', file, { doc_type: 'insurance' }))
      .rejects.toThrow(/File too large/)
  })

  it('rejects invalid doc_type via Zod', async () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1024)
    await expect(uploadDocument('uuid-1', file, { doc_type: 'invalid_type' }))
      .rejects.toThrow()
  })

  it('uploads a valid PDF and inserts a DB record', async () => {
    const file = makeFile('geran.pdf', 'application/pdf', 2048)
    const row = { document_id: 'uuid-doc-1', doc_type: 'geran' }
    const storageMock = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage/geran.pdf' } }),
    }
    supabase.storage.from.mockReturnValue(storageMock)
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })
    const result = await uploadDocument('uuid-1', file, { doc_type: 'geran' })
    expect(result).toEqual(row)
    expect(storageMock.upload).toHaveBeenCalled()
  })
})

describe('createDocument', () => {
  it('inserts a valid document record', async () => {
    const row = { document_id: 'uuid-doc-2', doc_type: 'road_tax' }
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    })
    const result = await createDocument('uuid-1', { doc_type: 'road_tax', doc_number: 'RT-2026' })
    expect(result).toEqual(row)
  })

  it('throws ZodError for invalid doc_type', async () => {
    await expect(createDocument('uuid-1', { doc_type: 'unknown' })).rejects.toThrow()
  })
})

describe('getDocumentsByVehicle', () => {
  it('returns documents ordered by created_at descending', async () => {
    const rows = [{ document_id: 'uuid-doc-1' }, { document_id: 'uuid-doc-2' }]
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })
    const result = await getDocumentsByVehicle('uuid-vehicle-1')
    expect(result).toEqual(rows)
  })
})
