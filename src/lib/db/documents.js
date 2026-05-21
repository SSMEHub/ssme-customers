import { supabase } from '../supabase'

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
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({ vehicle_id: vehicleId, ...docData })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function uploadDocument(vehicleId, file, docMeta) {
  const filePath = `${vehicleId}/${docMeta.doc_type}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('vehicle-documents')
    .upload(filePath, file)

  if (uploadError) throw uploadError

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
}
