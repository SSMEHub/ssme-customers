import { supabase } from '../supabase'

export async function getVehiclesByCustomer(customerId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .order('reg_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getVehicleByPlate(plateNumber) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customers ( customer_id, company_name, phone, email ),
      vehicle_documents ( document_id, doc_type, doc_number, expiry_date, file_url )
    `)
    .eq('plate_number', plateNumber.toUpperCase())
    .single()

  if (error) throw error
  return data
}

export async function createVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      ...vehicleData,
      plate_number: vehicleData.plate_number?.toUpperCase(),
      chassis_no: vehicleData.chassis_no?.toUpperCase(),
      engine_no: vehicleData.engine_no?.toUpperCase(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateVehicleMileage(vehicleId, mileageKm) {
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      last_mileage_km: mileageKm,
      last_mileage_date: new Date().toISOString().split('T')[0],
    })
    .eq('vehicle_id', vehicleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getReplacementTargets() {
  const { data, error } = await supabase
    .from('fleet_age_view')
    .select('*')
    .eq('replacement_due', true)
    .order('rri', { ascending: false })

  if (error) throw error
  return data
}
