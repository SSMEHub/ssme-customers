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
  status: z.enum(['active', 'sold', 'scrapped']).optional(),
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
