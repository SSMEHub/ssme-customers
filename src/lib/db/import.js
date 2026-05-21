import { supabase } from '../supabase'

export async function batchInsertStaging(rows) {
  const { data, error } = await supabase
    .from('import_staging')
    .insert(rows)
    .select()

  if (error) throw error
  return data
}

export async function getImportBatch(batchId) {
  const { data, error } = await supabase
    .from('import_staging')
    .select('*')
    .eq('batch_id', batchId)
    .order('row_index')

  if (error) throw error
  return data
}

export async function promoteValid(batchId) {
  const { data, error } = await supabase.rpc('promote_import_batch', {
    p_batch_id: batchId,
  })

  if (error) throw error
  return data
}
