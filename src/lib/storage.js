import { supabase } from './supabase'

const BUCKET = 'vehicle-documents'
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

export function validateFile(file) {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is 10MB.`)
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: PDF, JPG, PNG.`)
  }
}

export async function uploadDocument(vehicleId, docType, file) {
  validateFile(file)
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${vehicleId}/${docType}/${timestamp}_${safeName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

export async function getSignedUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error) throw error
  return data.signedUrl
}

export async function deleteDocument(storagePath) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath])

  if (error) throw error
}
