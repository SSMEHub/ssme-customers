import { supabase } from '../supabase'

export async function batchInsertStaging(rows) {
  // Try batch insert first
  const { data, error } = await supabase
    .from('import_staging')
    .insert(rows)
    .select()

  if (error) {
    // Fall back to row-by-row to identify which individual rows fail
    const results = []
    const rowErrors = []
    for (let i = 0; i < rows.length; i++) {
      const { data: rowData, error: rowError } = await supabase
        .from('import_staging')
        .insert(rows[i])
        .select()
      if (rowError) {
        rowErrors.push({ row: i, message: rowError.message, data: rows[i] })
      } else {
        results.push(rowData[0])
      }
    }
    console.error(
      `batchInsertStaging: ${rowErrors.length}/${rows.length} rows failed`,
      JSON.stringify(rowErrors, null, 2),
    )
    if (results.length === 0) {
      throw new Error(`All ${rowErrors.length} rows failed. First error: ${rowErrors[0].message}`)
    }
    // Partial success — return what inserted, caller decides how to handle
    return results
  }

  return data
}

export async function getImportBatch(batchId) {
  const { data, error } = await supabase
    .from('import_staging')
    .select('*')
    .eq('import_batch', batchId)
    .order('source_row')

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
