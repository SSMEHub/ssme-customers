import { supabase } from '../supabase'
import { z } from 'zod'

// JPJ/PUSPAKOM document types for Malaysian commercial vehicles (see CLAUDE.md domain rules)
export const DOC_TYPES = [
  'geran', 'insurance', 'road_tax', 'puspakom', 'sld', 'permit_apad',
  'permit_lpkp', 'report_awalan', 'invoice_sales', 'invoice_service', 'plan', 'other',
]
const docTypeSchema = z.enum(DOC_TYPES)

// Document upload constraints
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function getExpiryAlerts() {
  const { data, error } = await supabase
    .from('expiry_alerts_view')
    .select('*')
    .order('expiry_date', { ascending: true })

  if (error) throw error
  return data
}

export async function getDocumentsByVehicle(vehicleId) {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function upsertDocument(vehicleId, docData) {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({
      vehicle_id: vehicleId,
      ...docData,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createDocument(vehicleId, docData) {
  // Validate doc_type against the domain enum before insert (throws ZodError if invalid)
  docTypeSchema.parse(docData?.doc_type)

  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({ vehicle_id: vehicleId, ...docData })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uploadDocument(vehicleId, file, docMeta) {
  // Validate metadata + file BEFORE touching storage (throws ZodError if doc_type invalid)
  docTypeSchema.parse(docMeta?.doc_type)
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`)
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File too large: ${file.size} bytes (max ${MAX_FILE_BYTES})`)
  }

  const filePath = `${vehicleId}/${docMeta.doc_type}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('vehicle-documents')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  try {
    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: vehicleId,
        file_url: filePath,
        file_name: file.name,
        file_size_bytes: file.size,
        ...docMeta,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (insertError) {
    // Rollback: remove orphaned storage file when DB insert fails
    await supabase.storage.from('vehicle-documents').remove([filePath])
    throw insertError
  }
}
