import { supabase } from '../supabase'

export async function getExpiryAlerts() {
  const { data, error } = await supabase
    .from('expiry_alerts_view')
    .select('*')
    .order('expiry_date', { ascending: true })

  if (error) throw error
  return data
}

export async function getFleetAgeStats() {
  const { data, error } = await supabase
    .from('fleet_age_view')
    .select('vehicle_id, replacement_due, rri')
    .eq('replacement_due', true)

  if (error) throw error
  return { replacementCount: data.length, vehicles: data }
}

export async function getQuickStats() {
  const [customersRes, vehiclesRes, expiringRes] = await Promise.all([
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('expiry_alerts_view')
      .select('vehicle_id', { count: 'exact', head: true })
      .lte('days_until_expiry', 30)
      .gte('days_until_expiry', 0),
  ])

  if (customersRes.error) throw customersRes.error
  if (vehiclesRes.error) throw vehiclesRes.error
  if (expiringRes.error) throw expiringRes.error

  return {
    activeCustomers: customersRes.count,
    activeVehicles: vehiclesRes.count,
    expiringIn30Days: expiringRes.count,
  }
}
