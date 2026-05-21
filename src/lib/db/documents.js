// @ts-check
import { z } from 'zod'
import { supabase } from '../supabase'

const DOC_TYPES = /** @type {const} */ ([
  'geran', 'insurance', 'road_tax', 'puspakom',
  'sld', 'permit_apad', 'permit_lpkp',
  'report_awalan', 'invoice_sales', 'invoice_service', 'plan', 'other',
])

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

const DocumentMetaSchema = z.object({
  doc_type: z.enum(DOC_TYPES),
  doc_number: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
  emission_val: z.number().optional(),
  brake_eff_pct: z.number().optional(),
  gps_sirim_no: z.string().optional(),
  sld_calib_date: z.string().optional(),
})

/**
 * Fetch all documents nearing expiry from the expiry_alerts_view, ordered soonest first.
 * Used by the admin dashboard to surface road tax / insurance renewal alerts.
 * @returns {Promise<object[]>}
 * @throws {Error} on Supabase query failure
 */
export async function getExpiryAlerts() {
  try {
    const { data, error } = await supabase
      .from('expiry_alerts_view')
      .select('*')
      .order('expiry_date', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getExpiryAlerts', message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Fetch all documents for a given vehicle, ordered by creation date descending.
 * @param {string} vehicleId - UUID of the vehicle
 * @returns {Promise<object[]>}
 * @throws {Error} on Supabase query failure
 */
export async function getDocumentsByVehicle(vehicleId) {
  try {
    const { data, error } = await supabase
      .from('vehicle_documents')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getDocumentsByVehicle', params: { vehicleId }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Upload a physical document file to Supabase Storage and create a vehicle_documents record.
 *
 * Two-step operation: Storage upload first, then DB insert. If the DB insert fails after a
 * successful Storage upload, an orphaned file will remain in Storage (known gap — no cleanup yet).
 *
 * @param {string} vehicleId - UUID of the vehicle
 * @param {File} file - the file to upload (PDF, JPEG, or PNG; max 10 MB)
 * @param {z.infer<typeof DocumentMetaSchema>} docMeta - document metadata
 * @returns {Promise<object>} the inserted vehicle_documents row
 * @throws {Error} if file type or size is invalid
 * @throws {z.ZodError} if docMeta fails schema validation
 * @throws {Error} on Storage upload or Supabase insert failure
 */
export async function uploadDocument(vehicleId, file, docMeta) {
  try {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`File type not allowed: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`)
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File too large: ${file.size} bytes. Maximum: ${MAX_FILE_BYTES} bytes (10 MB)`)
    }

    const validatedMeta = DocumentMetaSchema.parse(docMeta)
    const fileExt = file.name.split('.').pop()
    const filePath = `vehicles/${vehicleId}/${validatedMeta.doc_type}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('vehicle-documents')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-documents')
      .getPublicUrl(filePath)

    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert({
        vehicle_id: vehicleId,
        file_url: publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        ...validatedMeta,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'uploadDocument', params: { vehicleId, fileName: file?.name }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Create a vehicle document record without a file upload (for manually keyed documents).
 * @param {string} vehicleId - UUID of the vehicle
 * @param {z.infer<typeof DocumentMetaSchema>} docData - document metadata
 * @returns {Promise<object>} the inserted vehicle_documents row
 * @throws {z.ZodError} if docData fails schema validation
 * @throws {Error} on Supabase insert failure
 */
export async function createDocument(vehicleId, docData) {
  try {
    const validated = DocumentMetaSchema.parse(docData)
    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert({ vehicle_id: vehicleId, ...validated })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'createDocument', params: { vehicleId }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}
