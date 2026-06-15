import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import { batchInsertStaging, promoteValid } from '../../lib/db/import'
import PageHeader from '../../components/ui/PageHeader.jsx'

// ── Parser helpers ────────────────────────────────────────────────────────────

const MY_PLATE_RE = /^[A-Z]{1,3}[0-9]{1,4}[A-Z]{0,2}$/

function normalisePlate(raw) {
  if (!raw) return { plate: null, error: null }
  const cleaned = String(raw).toUpperCase().replace(/\s/g, '')
  if (MY_PLATE_RE.test(cleaned)) return { plate: cleaned, error: null }
  return { plate: null, error: 'invalid_plate_format' }
}

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30))

function parseDate(raw) {
  if (raw === null || raw === undefined || raw === '') return { date: null, error: null }

  const s = String(raw).trim()

  // ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, error: null }

  // Malaysian DD/MM/YYYY variants
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (!isNaN(Date.parse(iso))) return { date: iso, error: null }
  }

  // Excel serial
  const n = Number(raw)
  if (!isNaN(n) && Number.isInteger(n) && n >= 20000 && n <= 60000) {
    const d = new Date(EXCEL_EPOCH.getTime() + n * 86400000)
    return { date: d.toISOString().split('T')[0], error: null }
  }

  return { date: null, error: 'unparseable_date' }
}

function parseAccountName(raw) {
  if (!raw) return {}
  const str = String(raw).trim()

  if (str.includes('***REJECTED CUSTOMER***')) {
    return { valid_status: 'skipped', raw_account_name: str }
  }

  const isUsed = /^USED\s+/i.test(str)
  const cleanStr = isUsed ? str.replace(/^USED\s+/i, '') : str

  const parts = cleanStr.split(' - ').map((p) => p.trim())
  const companyName = parts[0] || ''

  let plate = null
  let modelCode = null
  let bodyType = null

  if (parts[1]) {
    const { plate: p, error } = normalisePlate(parts[1])
    if (!error && p) {
      plate = p
    } else {
      modelCode = parts[1]
    }
  }

  if (parts[2]) bodyType = parts[2]

  return {
    company_name: companyName,
    plate_number: plate,
    model_code: modelCode,
    body_type: bodyType,
    is_second_hand: isUsed,
    valid_status: 'pending',
    raw_account_name: str,
  }
}

function parseRow(row, rowIndex) {
  const errors = []
  const parsed = {}

  // Account name
  const accountParsed = parseAccountName(row['Account Name'] ?? row['account_name'] ?? row['A'])
  Object.assign(parsed, accountParsed)

  if (parsed.valid_status === 'skipped') {
    return { ...parsed, row_index: rowIndex, errors: [], valid_status: 'skipped' }
  }

  if (!parsed.company_name) errors.push('company_name: missing')

  // Plate fallback from dedicated column
  if (!parsed.plate_number && (row['Plate'] ?? row['plate_number'])) {
    const { plate, error } = normalisePlate(row['Plate'] ?? row['plate_number'])
    if (error) errors.push(`plate: ${error}`)
    else parsed.plate_number = plate
  }

  // Dates
  const dateFields = [
    ['reg_date', row['Reg Date'] ?? row['reg_date']],
    ['delivery_date', row['Delivery Date'] ?? row['delivery_date']],
  ]
  for (const [field, val] of dateFields) {
    const { date, error } = parseDate(val)
    if (error) errors.push(`${field}: ${error}`)
    else if (date) parsed[field] = date
  }

  // Numeric fields
  const numFields = [
    ['gvw_kg', row['GVW'] ?? row['gvw_kg']],
    ['manufacture_yr', row['Year'] ?? row['manufacture_yr']],
  ]
  for (const [field, val] of numFields) {
    if (val !== undefined && val !== '') {
      const n = Number(val)
      if (isNaN(n)) errors.push(`${field}: not a number`)
      else parsed[field] = n
    }
  }

  parsed.maker = row['Maker'] ?? row['maker'] ?? ''
  parsed.chassis_no = row['Chassis'] ?? row['chassis_no'] ?? ''

  // Additional raw fields from Excel columns (SQL Accounting export convention)
  parsed.raw_customer_code = row['Customer Code'] ?? row['customer_code'] ?? null
  parsed.raw_phone = row['Phone'] ?? row['phone'] ?? null
  parsed.raw_ssm_or_ic = row['SSM'] ?? row['id_number'] ?? null

  return {
    ...parsed,
    row_index: rowIndex,
    raw_row: JSON.stringify(row),
    errors: errors,
    valid_status: errors.length === 0 ? 'valid' : 'error',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const TABS = ['Valid', 'Errors', 'Duplicates']

export default function ImportPage() {
  const [tab, setTab] = useState('Valid')
  const [rows, setRows] = useState([])
  const [batchId, setBatchId] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState(null)
  const [parseError, setParseError] = useState('')
  const [fileName, setFileName] = useState('')

  const valid = rows.filter((r) => r.valid_status === 'valid')
  const errors = rows.filter((r) => r.valid_status === 'error')
  const duplicates = rows.filter((r) => r.valid_status === 'duplicate')
  const skipped = rows.filter((r) => r.valid_status === 'skipped')

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.xlsx')) {
      setParseError('Only .xlsx files are supported.')
      return
    }
    setFileName(file.name)
    setParseError('')
    setRows([])
    setImportSummary(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const parsed = rawRows.map((r, i) => parseRow(r, i))
        const newBatchId = uuidv4()
        setBatchId(newBatchId)
        setRows(parsed.map((r) => ({ ...r, batch_id: newBatchId })))
      } catch (err) {
        setParseError('Failed to parse file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  async function handleImport() {
    if (!batchId || valid.length === 0) return
    setImporting(true)
    try {
      // Insert staging rows — map JS field names to DB column names
      await batchInsertStaging(
        valid.map((r) => ({
          // Batch tracking
          import_batch: batchId,
          source_row: r.row_index,
          source_file: fileName,
          source_type: 'excel',

          // Raw fields (import_staging uses raw_ prefix for unprocessed values)
          raw_customer_name: r.raw_account_name ?? r.company_name ?? '',
          raw_customer_code: r.raw_customer_code ?? null,
          raw_phone: r.raw_phone ?? null,
          raw_ssm_or_ic: r.raw_ssm_or_ic ?? null,
          raw_plate: r.plate_number ?? null,
          raw_chassis: r.chassis_no ?? null,
          raw_maker: r.maker ?? null,
          raw_model: r.model_code ?? null,
          raw_body_type: r.body_type ?? null,
          raw_reg_date: r.reg_date ?? null,
          raw_manufacture_yr: r.manufacture_yr != null ? String(r.manufacture_yr) : null,
          raw_gvw: r.gvw_kg != null ? String(r.gvw_kg) : null,

          // Normalised fields (already cleaned by the parser)
          normalized_plate: r.plate_number ?? null,
          parsed_reg_date: r.reg_date ?? null,
          parsed_gvw_kg: r.gvw_kg ?? null,
          parsed_manufacture_yr: r.manufacture_yr ?? null,

          // Validation result
          valid_status: 'valid',
        }))
      )
      const result = await promoteValid(batchId)
      setImportSummary(result)
    } catch (err) {
      setParseError('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const tabCount = { Valid: valid.length, Errors: errors.length, Duplicates: duplicates.length }

  const tabColor = {
    Valid: 'text-green-700',
    Errors: 'text-red-600',
    Duplicates: 'text-orange-600',
  }

  const activeRows = tab === 'Valid' ? valid : tab === 'Errors' ? errors : duplicates

  return (
    <div>
      <PageHeader title="Import" />

      {/* Step 1 — Upload */}
      <div className="bg-white border border-[#e0e2e6] rounded-lg p-5 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 1 — Upload Excel File
        </h2>
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFile}
            className="hidden"
          />
          <span className="px-3 py-1.5 border border-[#e0e2e6] text-sm rounded hover:bg-[#f8fafc] font-medium">
            Choose .xlsx file
          </span>
          {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
        </label>
        {parseError && <p className="text-xs text-red-500 mt-2">{parseError}</p>}
        {rows.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Parsed {rows.length} rows: {valid.length} valid, {errors.length} errors,{' '}
            {duplicates.length} duplicates, {skipped.length} skipped
          </p>
        )}
      </div>

      {/* Step 2 — Preview */}
      {rows.length > 0 && (
        <div className="bg-white border border-[#e0e2e6] rounded-lg mb-6 overflow-hidden">
          <div className="flex border-b border-[#e0e2e6]">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}{' '}
                <span className={`font-bold ${tabColor[t]}`}>({tabCount[t]})</span>
              </button>
            ))}
          </div>

          {activeRows.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">No rows in this category</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e0e2e6]">
                    <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Company Name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Plate</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Maker</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Body Type</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Reg Date</th>
                    {tab === 'Errors' && (
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Errors</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((r) => (
                    <tr
                      key={r.row_index}
                      className="border-b border-[#e0e2e6] last:border-0"
                    >
                      <td className="px-3 py-2 text-gray-400">{r.row_index + 1}</td>
                      <td className="px-3 py-2">{r.company_name || '—'}</td>
                      <td className="px-3 py-2 font-mono">{r.plate_number || '—'}</td>
                      <td className="px-3 py-2">{r.maker || '—'}</td>
                      <td className="px-3 py-2">{r.body_type || '—'}</td>
                      <td className="px-3 py-2">{r.reg_date || '—'}</td>
                      {tab === 'Errors' && (
                        <td className="px-3 py-2 text-red-600">
                          {Array.isArray(r.errors) ? r.errors.join('; ') : ''}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Import */}
      {valid.length > 0 && !importSummary && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {importing ? 'Importing…' : `Import ${valid.length} valid rows`}
          </button>
          <p className="text-xs text-gray-400">
            This will create customers and vehicles in the database.
          </p>
        </div>
      )}

      {importSummary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Import complete</p>
          <pre className="text-xs text-green-700 whitespace-pre-wrap">
            {JSON.stringify(importSummary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
