// @ts-check
import { z } from 'zod'
import { supabase } from '../supabase'

const VehicleInsertSchema = z.object({
  plate_number: z.string().min(1),
  customer_id: z.string().uuid(),
  maker: z.string().optional(),
  model_code: z.string().optional(),
  body_type: z.string().optional(),
  manufacture_yr: z.number().int().min(1950).max(2100).optional(),
  reg_date: z.string().optional(),
  chassis_no: z.string().optional(),
  engine_no: z.string().optional(),
  gvw_kg: z.number().positive().optional(),
  status: z.enum(['active', 'in_shop', 'decommissioned', 'scrapped']).optional(),
})

/**
 * Fetch all vehicles belonging to a customer, ordered by registration date descending.
 * @param {string} customerId - UUID of the customer
 * @returns {Promise<object[]>}
 * @throws {Error} on Supabase query failure
 */
export async function getVehiclesByCustomer(customerId) {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('reg_date', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getVehiclesByCustomer', params: { customerId }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Fetch a vehicle by plate number, including owner and document summary.
 * Plate number is normalised to uppercase before lookup.
 * @param {string} plateNumber - vehicle registration plate (e.g. "WA1234X")
 * @returns {Promise<object>}
 * @throws {Error} if not found or query fails
 */
export async function getVehicleByPlate(plateNumber) {
  try {
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
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getVehicleByPlate', params: { plateNumber }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Insert a new vehicle record.
 * plate_number, chassis_no, and engine_no are normalised to uppercase after validation.
 * @param {z.infer<typeof VehicleInsertSchema>} vehicleData
 * @returns {Promise<object>} the inserted vehicle row
 * @throws {z.ZodError} if vehicleData fails schema validation
 * @throws {Error} on Supabase insert failure
 */
export async function createVehicle(vehicleData) {
  try {
    const validated = VehicleInsertSchema.parse(vehicleData)
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        ...validated,
        plate_number: validated.plate_number.toUpperCase(),
        chassis_no: validated.chassis_no?.toUpperCase(),
        engine_no: validated.engine_no?.toUpperCase(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'createVehicle', message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Update a vehicle's last recorded mileage and the date of that reading.
 * @param {string} vehicleId - UUID of the vehicle
 * @param {number} mileageKm - current odometer reading in kilometres
 * @returns {Promise<object>} the updated vehicle row
 * @throws {Error} on Supabase update failure
 */
export async function updateVehicleMileage(vehicleId, mileageKm) {
  try {
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
  } catch (error) {
    console.error(JSON.stringify({ operation: 'updateVehicleMileage', params: { vehicleId, mileageKm }, message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

/**
 * Fetch vehicles flagged for replacement by the fleet age risk index (RRI).
 * Returns rows from fleet_age_view where replacement_due is true, ordered by RRI descending.
 * @returns {Promise<object[]>}
 * @throws {Error} on Supabase query failure
 */
export async function getReplacementTargets() {
  try {
    const { data, error } = await supabase
      .from('fleet_age_view')
      .select('*')
      .eq('replacement_due', true)
      .order('rri', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error(JSON.stringify({ operation: 'getReplacementTargets', message: error.message, code: error.code, ts: new Date().toISOString() }))
    throw error
  }
}

export async function getVehicleById(vehicleId) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customers ( customer_id, company_name, phone, email )
    `)
    .eq('vehicle_id', vehicleId)
    .single()

  if (error) throw error
  return data
}

export async function updateVehicle(vehicleId, updates) {
  const payload = { ...updates }
  if (payload.plate_number) payload.plate_number = payload.plate_number.toUpperCase().replace(/\s/g, '')
  if (payload.chassis_no) payload.chassis_no = payload.chassis_no.toUpperCase()
  if (payload.engine_no) payload.engine_no = payload.engine_no.toUpperCase()

  const { data, error } = await supabase
    .from('vehicles')
    .update(payload)
    .eq('vehicle_id', vehicleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteVehicle(vehicleId) {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('vehicle_id', vehicleId)

  if (error) throw error
}

export async function getVehiclesWithNextExpiry({ search = '', status = '', maker = '', replacementOnly = false } = {}) {
  let query = supabase
    .from('vehicles')
    .select(`
      vehicle_id, plate_number, maker, model_code, body_type,
      manufacture_yr, reg_date, status,
      customers ( customer_id, company_name ),
      vehicle_documents ( doc_type, expiry_date )
    `)
    .order('plate_number')

  if (search) {
    query = query.or(
      `plate_number.ilike.%${search}%,chassis_no.ilike.%${search}%`
    )
  }
  if (status) query = query.eq('status', status)
  if (maker) query = query.ilike('maker', `%${maker}%`)
  if (replacementOnly) {
    const cutoffYear = new Date().getFullYear() - 7
    query = query.lte('manufacture_yr', cutoffYear)
  }

  const { data, error } = await query
  if (error) throw error

  return data.map((v) => {
    const futureDocs = (v.vehicle_documents || [])
      .filter((d) => d.expiry_date)
      .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    return {
      ...v,
      next_expiry: futureDocs[0]?.expiry_date ?? null,
    }
  })
}

export async function searchVehicles(term) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      vehicle_id, plate_number, maker, model_code, status,
      customers ( company_name )
    `)
    .or(`plate_number.ilike.%${term}%,chassis_no.ilike.%${term}%`)
    .limit(8)
    .order('plate_number')

  if (error) throw error
  return data
}
